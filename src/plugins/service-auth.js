import Jwt from '@hapi/jwt'
import Boom from '@hapi/boom'
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

      logger.error(`BH temp - registering jwt`)
      await server.register(Jwt)

      logger.error(`BH temp - checking config`)
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

      logger.error(`BH temp - registering jwt strategy`)
      server.auth.strategy('service', 'jwt', {
        keys: {
          uri: config.get('serviceAuth.jwksUri')
        },
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

      logger.error(`BH temp - registering default strategy`)
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
