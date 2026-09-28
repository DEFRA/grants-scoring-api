import Jwt from '@hapi/jwt'
import Boom from '@hapi/boom'
import Wreck from '@hapi/wreck'
import { config } from '../config.js'
import { createLogger } from '../common/helpers/logging/logger.js'

const logger = createLogger()

export const LOCAL_SUBJECT = 'local'

export const serviceAuth = {
  plugin: {
    name: 'service-auth',
    register: async (server) => {
      addServiceAccessPreHandler(server)

      const isLocal = config.get('cdpEnvironment') === 'local'
      if (isLocal) {
        server.auth.scheme('local', () => ({
          authenticate: (_request, h) => {
            return h.authenticated({
              credentials: {
                sub: `s/${LOCAL_SUBJECT}`,
                serviceName: LOCAL_SUBJECT
              }
            })
          }
        }))
        server.auth.strategy('service', 'local')
        server.auth.default('service')
        return
      }

      await server.register(Jwt)

      const jwksUri = config.get('serviceAuth.jwksUri')
      const audience = config.get('serviceAuth.audience')
      const issuer = config.get('serviceAuth.issuer')
      const allowedServicesConfig = config.get('serviceAuth.allowedServices')
      if (!jwksUri) {
        throw new Error('Missing serviceAuth.jwksUri')
      }
      if (!audience) {
        throw new Error('Missing serviceAuth.audience')
      }
      if (!issuer) {
        throw new Error('Missing serviceAuth.issuer')
      }
      if (typeof allowedServicesConfig !== 'string') {
        throw new Error('Missing serviceAuth.allowedServices')
      }

      let jwksKeys = jwksUri
      const httpProxy = config.get('httpProxy')
      if (httpProxy) {
        try {
          const { HttpsProxyAgent } = await import('https-proxy-agent')
          const agent = new HttpsProxyAgent(httpProxy)
          const { payload } = await Wreck.get(jwksUri, { agent, json: true })
          jwksKeys = payload.keys
        } catch (err) {
          logger.error(`Failed to fetch JWKS via proxy: ${err.message}`)
          // Fallback to uri and hope for the best, or rethrow if mandatory
        }
      }

      server.auth.strategy('service', 'jwt', {
        keys: jwksKeys,
        verify: {
          aud: config.get('serviceAuth.audience'),
          iss: config.get('serviceAuth.issuer'),
          sub: false
        },
        validate: (artifacts) => {
          const sub = artifacts.decoded.payload.sub
          if (!sub) {
            logger.warn('Service-to-service auth rejected: missing sub claim')
            throw Boom.unauthorized()
          }

          const serviceName = sub.split('/').pop()

          if (serviceNotAllowed(serviceName)) {
            logger.warn(
              `Service-to-service auth rejected: service '${serviceName}' is not in allowed list`
            )
            throw Boom.unauthorized()
          }

          return { isValid: true, credentials: { sub, serviceName } }
        }
      })

      server.auth.default('service')
    }
  }
}

const addServiceAccessPreHandler = (server) => {
  server.ext('onPreHandler', (request, h) => {
    const allowedSubjects =
      request.route.settings.plugins?.['service-auth']?.allowedSubjects

    if (allowedSubjects) {
      allowedSubjects.push(LOCAL_SUBJECT) // Always allow local services for testing purposes

      const { serviceName } = request.auth.credentials
      if (!serviceName || !allowedSubjects.includes(serviceName)) {
        logger.warn(
          `Access denied for subject '${serviceName}' to restricted endpoint '${request.path}'`
        )
        throw Boom.forbidden()
      }
    }

    return h.continue
  })
}

const serviceNotAllowed = (serviceName) => {
  const allowedServices = config
    .get('serviceAuth.allowedServices')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  // service allowed if allowedServices is empty
  return allowedServices.length > 0 && !allowedServices.includes(serviceName)
}
