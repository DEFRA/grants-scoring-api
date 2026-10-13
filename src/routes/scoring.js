import { StatusCodes } from 'http-status-codes'
import Boom from '@hapi/boom'
import { calculateScore as calculateWaterManagementScore } from '#/common/helpers/scoring/water-management.js'
import { scoringParamsSchema, scoringQuerySchema } from '#/routes/schemas.js'

export const GRANTS_UI_SUBJECT = 'grants-ui'

export const scoring = [
  {
    method: 'GET',
    path: '/scoring/{grant}',
    options: {
      plugins: {
        'service-auth': {
          allowedSubjects: [GRANTS_UI_SUBJECT]
        }
      },
      validate: {
        params: scoringParamsSchema,
        query: scoringQuerySchema
      }
    },
    handler: async (request, h) => {
      const { grant } = request.params
      const {
        sectorsIrrigated,
        easting,
        northing,
        businessesUsingWater,
        planning,
        abstraction
      } = request.query

      if (grant === 'water-management') {
        const scores = await calculateWaterManagementScore(
          request.server.logger,
          request.server.db,
          sectorsIrrigated,
          easting,
          northing,
          businessesUsingWater,
          planning,
          abstraction
        )
        return h.response({ ...scores }).code(StatusCodes.OK)
      }

      throw Boom.notFound('Unsupported grant')
    }
  }
]
