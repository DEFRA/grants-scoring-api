import { StatusCodes } from 'http-status-codes'
import Boom from '@hapi/boom'
import {
  pointToHexagon,
  getHexagonScoreFromDatastore
} from '#/common/helpers/scoring/water-management.js'
import { validateLocationQuerySchema } from '#/routes/schemas.js'

export const validateLocation = {
  method: 'GET',
  path: '/validate/location',
  options: {
    validate: {
      query: validateLocationQuerySchema
    }
  },
  handler: async (request, h) => {
    const { easting, northing } = request.query

    const { q, r } = pointToHexagon(request.server.logger, easting, northing)

    const score = await getHexagonScoreFromDatastore(request.server.db, q, r)
    if (!score) {
      await request.metrics.counter(`validation.fail.unsupported_location`)
      throw Boom.badRequest('Location not found')
    }

    await request.metrics.counter(`validation.success`)
    return h.response({ message: 'success' }).code(StatusCodes.OK)
  }
}
