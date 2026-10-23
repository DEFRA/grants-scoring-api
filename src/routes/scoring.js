import { StatusCodes } from 'http-status-codes'
import Boom from '@hapi/boom'
import { audit } from '@defra/cdp-auditing'
import { calculateScore as calculateWaterManagementScore } from '#/common/helpers/scoring/water-management.js'
import { scoringParamsSchema, scoringQuerySchema } from '#/routes/schemas.js'

export const scoring = [
  {
    method: 'GET',
    path: '/scoring/{grant}',
    options: {
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
      audit(
        {
          event: 'scoring-request',
          grant,
          location: { easting, northing },
          sectorsIrrigated,
          businessesUsingWater
        },
        'Calculating score for grant'
      )
      if (grant === 'water-management') {
        const scores = await calculateWaterManagementScore(
          request.server,
          sectorsIrrigated,
          easting,
          northing,
          businessesUsingWater,
          planning,
          abstraction
        )
        await request.metrics.counter(`scoring.success`)
        return h.response({ ...scores }).code(StatusCodes.OK)
      }

      await request.metrics.counter(`scoring.fail.unsupported_grant`)
      throw Boom.notFound('Unsupported grant')
    }
  }
]
