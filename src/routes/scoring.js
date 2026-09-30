import { StatusCodes } from 'http-status-codes'
import Joi from 'joi'
import Boom from '@hapi/boom'
import { calculateScore as calculateWaterManagementScore } from '#/common/helpers/scoring/water-management.js'

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
          growing: Joi.string()
            .optional()
            .description('The type of crop being grown'),
          easting: Joi.number()
            .optional()
            .description('The easting coordinate of the location'),
          northing: Joi.number()
            .optional()
            .description('The northing coordinate of the location'),
          supplyOthers: Joi.string()
            .optional()
            .description('Whether the supply is shared with others'),
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
        growing = 'food',
        easting = 380712,
        northing = 396269,
        supplyOthers = '5+',
        planning = true,
        abstraction = 'NN'
      } = request.query

      if (grant === 'water-management') {
        const scores = await calculateWaterManagementScore(
          request.server.db,
          growing,
          easting,
          northing,
          supplyOthers,
          planning,
          abstraction
        )
        return h.response({ ...scores }).code(StatusCodes.OK)
      }

      throw Boom.notFound('Unsupported grant')
    }
  }
]
