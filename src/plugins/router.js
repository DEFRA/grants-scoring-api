import { health } from '#/routes/health.js'
import { scoring } from '#/routes/scoring.js'
import { validateLocation } from '#/routes/validate-location.js'

export const router = {
  plugin: {
    name: 'router',
    register: (server, _options) => {
      server.route([health, validateLocation].concat(scoring))
    }
  }
}
