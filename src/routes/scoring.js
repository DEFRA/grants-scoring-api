import Joi from 'joi'
import Boom from '@hapi/boom'

export const scoring = [
  {
    method: 'GET',
    path: '/scoring/{grant}',
    options: {
      validate: {
        params: Joi.object({
          grant: Joi.string().required().description('The grant identifier')
        }),
        query: Joi.object({
          county: Joi.string().optional().description('The county for scoring')
        })
      }
    },
    handler: (request, h) => {
      const { grant } = request.params
      const { county } = request.query

      if (grant === 'water-management') {
        return calculateWaterManagementScore(county, h)
      }

      throw Boom.notFound('Unsupported grant')
    }
  }
]

const calculateWaterManagementScore = (county, h) => {
  const scoresByCounty = {
    BERKSHIRE: { score: 75, band: 'Strong' },
    BRISTOL: { score: 25, band: 'Weak' }
  }

  const { score, band } = scoresByCounty[county] || {
    score: 50,
    band: 'Average'
  }

  return h.response({ score, band }).code(200)
}
