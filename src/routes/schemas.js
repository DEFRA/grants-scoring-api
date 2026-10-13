import Joi from 'joi'
import {
  sectorsIrrigatedScores,
  collaborationScores
} from '#/common/helpers/scoring/water-management.js'

const planningAbstractionValues = ['Y', 'N', 'NN']

const easting = Joi.number()
  .required()
  .description('The easting coordinate of the location')

const northing = Joi.number()
  .required()
  .description('The northing coordinate of the location')

export const scoringParamsSchema = Joi.object({
  grant: Joi.string().required().description('The grant identifier')
})

export const scoringQuerySchema = Joi.object({
  sectorsIrrigated: Joi.any()
    .custom((value, helpers) => {
      const array = typeof value === 'string' ? value.split(',') : value

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
    .description('The sectors being irrigated using the water from the project'),
  easting,
  northing,
  businessesUsingWater: Joi.string()
    .valid(...Object.keys(collaborationScores))
    .required()
    .description('The number of businesses using the water from the project'),
  planning: Joi.string()
    .valid(...planningAbstractionValues)
    .required()
    .description('Whether planning permission is needed/held'),
  abstraction: Joi.string()
    .valid(...planningAbstractionValues)
    .required()
    .description('Whether an abstraction licence is needed/held')
})

export const validateLocationQuerySchema = Joi.object({
  easting,
  northing
})
