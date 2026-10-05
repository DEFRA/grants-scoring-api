import { StatusCodes } from 'http-status-codes'
import Joi from 'joi'
import Boom from '@hapi/boom'
import {
  calculateScore as calculateWaterManagementScore,
  sectorsIrrigatedScores,
  collaborationScores
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
        query: Joi.object({
          sectorsIrrigated: Joi.array()
            .items(Joi.string().valid(...Object.keys(sectorsIrrigatedScores)))
            .single()
            .optional()
            .description(
              'The sectors being irrigated using the water from the project'
            ),
          easting: Joi.number()
            .optional()
            .description('The easting coordinate of the location'),
          northing: Joi.number()
            .optional()
            .description('The northing coordinate of the location'),
          businessesUsingWater: Joi.string()
            .valid(...Object.keys(collaborationScores))
            .optional()
            .description(
              'The number of businesses using the water from the project'
            ),
          planning: Joi.boolean()
            .optional()
            .description('Whether planning permission is held'),
          abstraction: Joi.string()
            .valid('Y', 'N', 'NN')
            .optional()
            .description('Whether an abstraction license is held/required')
        })
      }
    },
    handler: async (request, h) => {
      const { grant } = request.params
      // TODO BH remove defaults
      const {
        sectorsIrrigated = ['SOFT_AND_CANE_FRUIT'],
        easting = 380712,
        northing = 396269,
        businessesUsingWater = 'FIVE_OR_MORE',
        planning = true,
        abstraction = 'NN'
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
