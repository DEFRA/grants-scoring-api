import Boom from '@hapi/boom'
import { createLogger } from '../common/helpers/logging/logger.js'

const logger = createLogger()

export const LOCAL_SUBJECT = 'local'

export const serviceAuth = {
  plugin: {
    name: 'service-auth',
    dependencies: ['@hapi/jwt'],
    register: async (server) => {
      addServiceAccessPreHandler(server)

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
