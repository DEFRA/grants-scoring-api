import { startServer } from '#/common/helpers/start-server.js'
import { StatusCodes } from 'http-status-codes'
import { pointToHexagon } from '#/common/helpers/scoring/water-management.js'

describe('#scoringController', () => {
  /** @type {Server} */
  let server
  const scoreToEastingNorthingMap = {
    9: { easting: 180712, northing: 296269 },
    8: { easting: 180712, northing: 396269 },
    7: { easting: 380712, northing: 496269 },
    6: { easting: 480712, northing: 596269 },
    5: { easting: 580712, northing: 696269 },
    4: { easting: 680712, northing: 796269 },
    3: { easting: 780712, northing: 896269 },
    2: { easting: 880712, northing: 996269 },
    1: { easting: 980712, northing: 196269 }
  }

  beforeAll(async () => {
    // Start the server
    server = await startServer()

    // Insert the hexagon scores into the database
    const { db } = server
    for (const score in scoreToEastingNorthingMap) {
      const { easting, northing } = scoreToEastingNorthingMap[score]
      const { q, r } = pointToHexagon(server.logger, easting, northing)
      await db.collection('hexagons').insertOne({ q, r, score: Number(score) })
    }
  })

  test.each([
    {
      sectorsDesc: 'Grass sector is',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=GRASS_FEEDING_LIVESTOCK_COMMERCIAL_TURF&businessesUsingWater=ONE&planning=Y&abstraction=N',
      collaborationScore: 0,
      planningAbstractionScore: 0,
      scarcityScore: 0,
      sectorScore: 10,
      totalScore: 10
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
        'easting=286394&northing=128750&sectorsIrrigated=SOFT_AND_CANE_FRUIT&sectorsIrrigated=PROTECTED_EDIBLE_CROPS&sectorsIrrigated=ORNAMENTALS&sectorsIrrigated=FOREST_NURSERY&sectorsIrrigated=TOP_AND_STONE_FRUIT&sectorsIrrigated=FIELD_SCALE_VEGETABLES&sectorsIrrigated=ARABLE&sectorsIrrigated=GRASS_FEEDING_LIVESTOCK_COMMERCIAL_TURF&businessesUsingWater=ONE&planning=Y&abstraction=N',
      collaborationScore: 0,
      planningAbstractionScore: 0,
      scarcityScore: 0,
      sectorScore: 30,
      totalScore: 30
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
      sectorScore: 10,
      totalScore: 10
    },
    {
      collaborationDesc: 'Two to four businesses are',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=ORNAMENTALS&businessesUsingWater=TWO_TO_FOUR&planning=Y&abstraction=N',
      collaborationScore: 7,
      planningAbstractionScore: 0,
      scarcityScore: 0,
      sectorScore: 10,
      totalScore: 17
    },
    {
      collaborationDesc: 'Five or more businesses are',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=ORNAMENTALS&businessesUsingWater=FIVE_OR_MORE&planning=Y&abstraction=N',
      collaborationScore: 15,
      planningAbstractionScore: 0,
      scarcityScore: 0,
      sectorScore: 10,
      totalScore: 25
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
      sectorScore: 20,
      totalScore: 20
    },
    {
      planningAbstractionDesc: 'Planning N and Abstraction Y is',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=TOP_AND_STONE_FRUIT&businessesUsingWater=ONE&planning=N&abstraction=Y',
      collaborationScore: 0,
      planningAbstractionScore: 0,
      scarcityScore: 0,
      sectorScore: 20,
      totalScore: 20
    },
    {
      planningAbstractionDesc: 'Planning N and Abstraction N is',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=TOP_AND_STONE_FRUIT&businessesUsingWater=ONE&planning=N&abstraction=N',
      collaborationScore: 0,
      planningAbstractionScore: 0,
      scarcityScore: 0,
      sectorScore: 20,
      totalScore: 20
    },
    {
      planningAbstractionDesc: 'Planning Y and Abstraction Y is',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=TOP_AND_STONE_FRUIT&businessesUsingWater=ONE&planning=Y&abstraction=Y',
      collaborationScore: 0,
      planningAbstractionScore: 5,
      scarcityScore: 0,
      sectorScore: 20,
      totalScore: 25
    },
    {
      planningAbstractionDesc: 'Planning Y and Abstraction NN is',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=TOP_AND_STONE_FRUIT&businessesUsingWater=ONE&planning=Y&abstraction=NN',
      collaborationScore: 0,
      planningAbstractionScore: 5,
      scarcityScore: 0,
      sectorScore: 20,
      totalScore: 25
    },
    {
      planningAbstractionDesc: 'Planning NN and Abstraction Y is',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=TOP_AND_STONE_FRUIT&businessesUsingWater=ONE&planning=NN&abstraction=Y',
      collaborationScore: 0,
      planningAbstractionScore: 5,
      scarcityScore: 0,
      sectorScore: 20,
      totalScore: 25
    },
    {
      planningAbstractionDesc: 'Planning NN and Abstraction NN is',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=TOP_AND_STONE_FRUIT&businessesUsingWater=ONE&planning=NN&abstraction=NN',
      collaborationScore: 0,
      planningAbstractionScore: 5,
      scarcityScore: 0,
      sectorScore: 20,
      totalScore: 25
    },
    {
      planningAbstractionDesc: 'Planning NNDM and Abstraction Y is',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=TOP_AND_STONE_FRUIT&businessesUsingWater=ONE&planning=NNDM&abstraction=Y',
      collaborationScore: 0,
      planningAbstractionScore: 5,
      scarcityScore: 0,
      sectorScore: 20,
      totalScore: 25
    },
    {
      planningAbstractionDesc: 'Planning NNDM and Abstraction N is',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=TOP_AND_STONE_FRUIT&businessesUsingWater=ONE&planning=NNDM&abstraction=N',
      collaborationScore: 0,
      planningAbstractionScore: 0,
      scarcityScore: 0,
      sectorScore: 20,
      totalScore: 20
    },
    {
      planningAbstractionDesc: 'Planning NNDM and Abstraction NN is',
      params:
        'easting=286394&northing=128750&sectorsIrrigated=TOP_AND_STONE_FRUIT&businessesUsingWater=ONE&planning=NNDM&abstraction=NN',
      collaborationScore: 0,
      planningAbstractionScore: 5,
      scarcityScore: 0,
      sectorScore: 20,
      totalScore: 25
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

  test.each([
    {
      scarcitySelectionDesc: 'An area on the map = level 9 is selected',
      mapLevel: 9,
      collaborationScore: 0,
      planningAbstractionScore: 0,
      scarcityScore: 50,
      sectorScore: 20,
      totalScore: 70
    },
    {
      scarcitySelectionDesc: 'An area on the map = level 8 is selected',
      mapLevel: 8,
      collaborationScore: 0,
      planningAbstractionScore: 0,
      scarcityScore: 45,
      sectorScore: 20,
      totalScore: 65
    },
    {
      scarcitySelectionDesc: 'An area on the map = level 7 is selected',
      mapLevel: 7,
      collaborationScore: 0,
      planningAbstractionScore: 0,
      scarcityScore: 45,
      sectorScore: 20,
      totalScore: 65
    },
    {
      scarcitySelectionDesc: 'An area on the map = level 6 is selected',
      mapLevel: 6,
      collaborationScore: 0,
      planningAbstractionScore: 0,
      scarcityScore: 35,
      sectorScore: 20,
      totalScore: 55
    },
    {
      scarcitySelectionDesc: 'An area on the map = level 5 is selected',
      mapLevel: 5,
      collaborationScore: 0,
      planningAbstractionScore: 0,
      scarcityScore: 35,
      sectorScore: 20,
      totalScore: 55
    },
    {
      scarcitySelectionDesc: 'An area on the map = level 4 is selected',
      mapLevel: 4,
      collaborationScore: 0,
      planningAbstractionScore: 0,
      scarcityScore: 25,
      sectorScore: 20,
      totalScore: 45
    },
    {
      scarcitySelectionDesc: 'An area on the map = level 3 is selected',
      mapLevel: 3,
      collaborationScore: 0,
      planningAbstractionScore: 0,
      scarcityScore: 25,
      sectorScore: 20,
      totalScore: 45
    },
    {
      scarcitySelectionDesc: 'An area on the map = level 2 is selected',
      mapLevel: 2,
      collaborationScore: 0,
      planningAbstractionScore: 0,
      scarcityScore: 15,
      sectorScore: 20,
      totalScore: 35
    },
    {
      scarcitySelectionDesc: 'An area on the map = level 1 is selected',
      mapLevel: 1,
      collaborationScore: 0,
      planningAbstractionScore: 0,
      scarcityScore: 0,
      sectorScore: 20,
      totalScore: 20
    }
  ])(
    'The scoring API has been updated - $scarcitySelectionDesc - The returned scored percentage for Water Scarcity is equal to $scarcityScore points ($scarcityScore%)',
    async ({
      mapLevel,
      collaborationScore,
      planningAbstractionScore,
      scarcityScore,
      sectorScore,
      totalScore
    }) => {
      const point = scoreToEastingNorthingMap[mapLevel]
      const params = `easting=${point.easting}&northing=${point.northing}&sectorsIrrigated=TOP_AND_STONE_FRUIT&businessesUsingWater=ONE&planning=Y&abstraction=N`
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
