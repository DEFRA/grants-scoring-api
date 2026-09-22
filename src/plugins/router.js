import { health } from '#/routes/health.js'
import { scoring } from '#/routes/scoring.js'

export const router = {
  plugin: {
    name: 'router',
    register: (server, _options) => {
      server.route([health].concat(scoring))
    }
  }
}
