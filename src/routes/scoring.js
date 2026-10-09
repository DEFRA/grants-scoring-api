import { StatusCodes } from 'http-status-codes'
import Joi from 'joi'
import Boom from '@hapi/boom'
import {
  calculateScore as calculateWaterManagementScore,
  sectorsIrrigatedScores,
  collaborationScores
} from '#/common/helpers/scoring/water-management.js'

export const GRANTS_UI_SUBJECT = 'grants-ui'

const planningAbstractionValues = ['Y', 'N', 'NN']

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
          sectorsIrrigated: Joi.any()
            .custom((value, helpers) => {
              const array = typeof value === 'string'
                ? value.split(',')
                : Array.isArray(value)
                  ? value.flatMap((v) => (typeof v === 'string' ? v.split(',') : v))
                  : value

              const { error, value: validated } = Joi.array()
                .items(Joi.string().valid(...Object.keys(sectorsIrrigatedScores)))
                .single()
                .validate(array)

              if (error) {
                return helpers.error('any.invalid')
              }

              return validated
            })
            .required()
            .description(
              'The sectors being irrigated using the water from the project'
            ),
          easting: Joi.number()
            .required()
            .description('The easting coordinate of the location'),
          northing: Joi.number()
            .required()
            .description('The northing coordinate of the location'),
          businessesUsingWater: Joi.string()
            .valid(...Object.keys(collaborationScores))
            .required()
            .description(
              'The number of businesses using the water from the project'
            ),
          planning: Joi.string()
            .valid(...planningAbstractionValues)
            .required()
            .description('Whether planning permission is needed/held'),
          abstraction: Joi.string()
            .valid(...planningAbstractionValues)
            .required()
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
