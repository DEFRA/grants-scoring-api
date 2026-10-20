import { startServer } from '#/common/helpers/start-server.js'
import { StatusCodes } from 'http-status-codes'

describe('#scoringController', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await startServer()
  })

  test.each([
    {
      sectorsDesc: 'Grass sector is',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=GRASS_FEEDING_LIVESTOCK_COMMERCIAL_TURF&businessesUsingWater=ONE&planning=Y&abstraction=N',
      collaborationScore: 0,
      planningAbstractionScore: 0,
      scarcityScore: 0,
      sectorScore: 2,
      totalScore: 2
    },
    {
      sectorsDesc: 'Arable, Top & Stone Fruit, and Ornamentals sectors are',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=ORNAMENTALS&sectorsIrrigated=TOP_AND_STONE_FRUIT&sectorsIrrigated=ARABLE&businessesUsingWater=ONE&planning=Y&abstraction=N',
      collaborationScore: 0,
      planningAbstractionScore: 0,
      scarcityScore: 0,
      sectorScore: 20,
      totalScore: 20
    },
    {
      sectorsDesc: 'All sectors are',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=SOFT_AND_CANE_FRUIT&sectorsIrrigated=PROTECTED_EDIBLE_CROPS&sectorsIrrigated=ORNAMENTALS&sectorsIrrigated=FOREST_NURSERY&sectorsIrrigated=TOP_AND_STONE_FRUIT&sectorsIrrigated=VINEYARDS&sectorsIrrigated=FIELD_SCALE_VEGETABLES&sectorsIrrigated=ARABLE&sectorsIrrigated=GRASS_FEEDING_LIVESTOCK_COMMERCIAL_TURF&businessesUsingWater=ONE&planning=Y&abstraction=N',
      collaborationScore: 0,
      planningAbstractionScore: 0,
      scarcityScore: 0,
      sectorScore: 25,
      totalScore: 25
    }
  ])(
    'The scoring API has been updated - $sectorsDesc selected - should return a sector score of $sectorScore',
    async ({
      params,
      collaborationScore,
      planningAbstractionScore,
      scarcityScore,
      sectorScore,
      totalScore
    }) => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: `/scoring/water-management?${params}`
      })

      expect(result).toEqual({
        collaborationScore,
        planningAbstractionScore,
        scarcityScore,
        sectorScore,
        totalScore
      })
      expect(statusCode).toBe(StatusCodes.OK)
    }
  )

  test.each([
    {
      invalidSectorDesc: 'Invalid sector is',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=INVALID_SECTOR&businessesUsingWater=ONE&planning=Y&abstraction=N'
    },
    {
      invalidSectorDesc: 'Invalid sector (Special characters) is',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=*^@^£%@!&businessesUsingWater=ONE&planning=Y&abstraction=N'
    },
    {
      invalidSectorDesc: 'Invalid sector (numbers) is',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=28378837&businessesUsingWater=ONE&planning=Y&abstraction=N'
    }
  ])(
    'The scoring API has been updated - $invalidSectorDesc selected - should return a 400 Bad Request error',
    async ({ params }) => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: `/scoring/water-management?${params}`
      })

      expect(result).toEqual({
        error: 'Bad Request',
        message: '"sectorsIrrigated" contains an invalid value',
        statusCode: 400,
        validation: {
          keys: ['sectorsIrrigated'],
          source: 'query'
        }
      })
      expect(statusCode).toBe(StatusCodes.BAD_REQUEST)
    }
  )

  test.each([
    {
      collaborationDesc: 'One business is',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=ORNAMENTALS&businessesUsingWater=ONE&planning=Y&abstraction=N',
      collaborationScore: 0,
      planningAbstractionScore: 0,
      scarcityScore: 0,
      sectorScore: 20,
      totalScore: 20
    },
    {
      collaborationDesc: 'Two to four businesses are',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=ORNAMENTALS&businessesUsingWater=TWO_TO_FOUR&planning=Y&abstraction=N',
      collaborationScore: 5,
      planningAbstractionScore: 0,
      scarcityScore: 0,
      sectorScore: 20,
      totalScore: 25
    },
    {
      collaborationDesc: 'Five or more businesses are',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=ORNAMENTALS&businessesUsingWater=FIVE_OR_MORE&planning=Y&abstraction=N',
      collaborationScore: 10,
      planningAbstractionScore: 0,
      scarcityScore: 0,
      sectorScore: 20,
      totalScore: 30
    }
  ])(
    'The scoring API has been updated - $collaborationDesc selected - The returned score percentage for Collaboration is $collaborationScore%',
    async ({
      params,
      collaborationScore,
      planningAbstractionScore,
      scarcityScore,
      sectorScore,
      totalScore
    }) => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: `/scoring/water-management?${params}`
      })

      expect(result).toEqual({
        collaborationScore,
        planningAbstractionScore,
        scarcityScore,
        sectorScore,
        totalScore
      })
      expect(statusCode).toBe(StatusCodes.OK)
    }
  )

  test.each([
    {
      planningAbstractionDesc: 'Planning Y and Abstraction N is',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=TOP_AND_STONE_FRUIT&businessesUsingWater=ONE&planning=Y&abstraction=N',
      collaborationScore: 0,
      planningAbstractionScore: 0,
      scarcityScore: 0,
      sectorScore: 15,
      totalScore: 15
    },
    {
      planningAbstractionDesc: 'Planning N and Abstraction Y is',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=TOP_AND_STONE_FRUIT&businessesUsingWater=ONE&planning=N&abstraction=Y',
      collaborationScore: 0,
      planningAbstractionScore: 0,
      scarcityScore: 0,
      sectorScore: 15,
      totalScore: 15
    },
    {
      planningAbstractionDesc: 'Planning N and Abstraction N is',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=TOP_AND_STONE_FRUIT&businessesUsingWater=ONE&planning=N&abstraction=N',
      collaborationScore: 0,
      planningAbstractionScore: 0,
      scarcityScore: 0,
      sectorScore: 15,
      totalScore: 15
    },
    {
      planningAbstractionDesc: 'Planning Y and Abstraction Y is',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=TOP_AND_STONE_FRUIT&businessesUsingWater=ONE&planning=Y&abstraction=Y',
      collaborationScore: 0,
      planningAbstractionScore: 5,
      scarcityScore: 0,
      sectorScore: 15,
      totalScore: 20
    },
    {
      planningAbstractionDesc: 'Planning Y and Abstraction NN is',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=TOP_AND_STONE_FRUIT&businessesUsingWater=ONE&planning=Y&abstraction=NN',
      collaborationScore: 0,
      planningAbstractionScore: 5,
      scarcityScore: 0,
      sectorScore: 15,
      totalScore: 20
    },
    {
      planningAbstractionDesc: 'Planning NN and Abstraction Y is',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=TOP_AND_STONE_FRUIT&businessesUsingWater=ONE&planning=NN&abstraction=Y',
      collaborationScore: 0,
      planningAbstractionScore: 5,
      scarcityScore: 0,
      sectorScore: 15,
      totalScore: 20
    },
    {
      planningAbstractionDesc: 'Planning NN and Abstraction NN is',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=TOP_AND_STONE_FRUIT&businessesUsingWater=ONE&planning=NN&abstraction=NN',
      collaborationScore: 0,
      planningAbstractionScore: 5,
      scarcityScore: 0,
      sectorScore: 15,
      totalScore: 20
    }
  ])(
    'The scoring API has been updated - answer to $planningAbstractionDesc selected - returned score percentage for planningAbstraction is $planningAbstractionScore%',
    async ({
      params,
      collaborationScore,
      planningAbstractionScore,
      scarcityScore,
      sectorScore,
      totalScore
    }) => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: `/scoring/water-management?${params}`
      })

      expect(result).toEqual({
        collaborationScore,
        planningAbstractionScore,
        scarcityScore,
        sectorScore,
        totalScore
      })
      expect(statusCode).toBe(StatusCodes.OK)
    }
  )
})

/**
 * @import { Server } from '@hapi/hapi'
 */
