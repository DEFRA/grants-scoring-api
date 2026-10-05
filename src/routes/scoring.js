import { StatusCodes } from 'http-status-codes'
import Joi from 'joi'
import Boom from '@hapi/boom'
import {
  calculateScore as calculateWaterManagementScore,
  sectorsIrrigatedScores,
  collaborationScores,
  planningAbstractionValues
} from '#/common/helpers/scoring/water-management.js'

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
        params: Joi.object({
          grant: Joi.string().required().description('The grant identifier')
        }),
        // TODO remove optional and default
        query: Joi.object({
          sectorsIrrigated: Joi.array()
            .items(Joi.string().valid(...Object.keys(sectorsIrrigatedScores)))
            .single()
            .optional()
            .default(['SOFT_AND_CANE_FRUIT'])
            .description(
              'The sectors being irrigated using the water from the project'
            ),
          easting: Joi.number()
            .optional()
            .default(380712)
            .description('The easting coordinate of the location'),
          northing: Joi.number()
            .optional()
            .default(396269)
            .description('The northing coordinate of the location'),
          businessesUsingWater: Joi.string()
            .valid(...Object.keys(collaborationScores))
            .optional()
            .default('FIVE_OR_MORE')
            .description(
              'The number of businesses using the water from the project'
            ),
          planning: Joi.string()
            .valid(...planningAbstractionValues)
            .optional()
            .default('Y')
            .description('Whether planning permission is needed/held'),
          abstraction: Joi.string()
            .valid(...planningAbstractionValues)
            .optional()
            .default('NN')
            .description('Whether an abstraction licence is needed/held')
        })
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
