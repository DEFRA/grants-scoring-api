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
      await server.register(Jwt)

      if (config.get('serviceAuth.enabled')) {
        const allowedServices = config
          .get('serviceAuth.allowedServices')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)

        server.auth.strategy('service-jwt', 'jwt', {
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
            if (
              allowedServices.length > 0 &&
              !allowedServices.includes(serviceName)
            ) {
              logger.warn(
                `Service-to-service auth rejected: service '${serviceName}' is not in allowed list`
              )
              throw Boom.unauthorized()
            }

            return { isValid: true, credentials: { sub, serviceName } }
          }
        })
      }

      addServiceAccessPreHandler(server)

      server.auth.scheme('service-custom', () => ({
        authenticate: async (request, h) => {
          const isLocalEnvironment = config.get('cdpEnvironment') === 'local'
          if (isLocalEnvironment) {
            return h.authenticated({
              credentials: { authenticated: true, serviceName: LOCAL_SUBJECT }
            })
          }

          const authorizationHeader = request.headers.authorization
          if (!authorizationHeader?.startsWith('Bearer ')) {
            throw Boom.unauthorized()
          }
          const { credentials } = await server.auth.test('service-jwt', request)
          return h.authenticated({
            credentials: { ...credentials, authenticated: true, type: 'jwt' }
          })
        }
      }))
      server.auth.strategy('service', 'service-custom')
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
