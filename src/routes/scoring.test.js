import { StatusCodes } from 'http-status-codes'
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { scoring } from './scoring.js'
import Hapi from '@hapi/hapi'
import { failAction } from '#/common/helpers/fail-action.js'
import * as waterManagementHelper from '#/common/helpers/scoring/water-management.js'

vi.mock(
  '#/common/helpers/scoring/water-management.js',
  async (importOriginal) => {
    const actual = await importOriginal()
    return {
      ...actual,
      calculateScore: vi.fn()
    }
  }
)

describe('Scoring Route', () => {
  let server

  beforeAll(async () => {
    server = Hapi.server({
      routes: {
        validate: {
          options: {
            abortEarly: false
          },
          failAction
        }
      }
    })
    server.decorate('server', 'db', {}) // Add mock db
    server.route(scoring)
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  it('should return mocked scores for water-management grant', async () => {
    waterManagementHelper.calculateScore.mockResolvedValue({
      totalScore: 100,
      sectorScore: 25,
      scarcityScore: 60,
      collaborationScore: 10,
      planningAbstractionScore: 5
    })

    const res = await server.inject({
      method: 'GET',
      url: '/scoring/water-management?sectorsIrrigated=SOFT_AND_CANE_FRUIT&sectorsIrrigated=ARABLE&easting=380712&northing=396269&supplyOthers=5%2B&planning=true&abstraction=Y'
    })

    expect(res.statusCode).toBe(StatusCodes.OK)
    expect(res.result).toEqual({
      totalScore: 100,
      sectorScore: 25,
      scarcityScore: 60,
      collaborationScore: 10,
      planningAbstractionScore: 5
    })
    expect(waterManagementHelper.calculateScore).toHaveBeenCalledWith(
      undefined, // logger
      {}, // db
      ['SOFT_AND_CANE_FRUIT', 'ARABLE'], // sectorsIrrigated
      380712, // easting (parsed as number by Joi)
      396269, // northing (parsed as number by Joi)
      '5+', // supplyOthers
      true, // planning (parsed as boolean by Joi)
      'Y' // abstraction (parsed as string by Joi)
    )
  })

  it('should return 400 if abstraction is invalid', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/scoring/water-management?abstraction=INVALID'
    })

    expect(res.statusCode).toBe(StatusCodes.BAD_REQUEST)
  })

  it('should return 400 if sectorsIrrigated contains invalid values', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/scoring/water-management?sectorsIrrigated=SOFT_AND_CANE_FRUIT&sectorsIrrigated=INVALID_SECTOR'
    })

    expect(res.statusCode).toBe(StatusCodes.BAD_REQUEST)
  })

  it('should return 200 if only one sectorsIrrigated query param is present', async () => {
    waterManagementHelper.calculateScore.mockResolvedValue({
      totalScore: 100,
      sectorScore: 25,
      scarcityScore: 60,
      collaborationScore: 10,
      planningAbstractionScore: 5
    })

    const res = await server.inject({
      method: 'GET',
      url: '/scoring/water-management?sectorsIrrigated=SOFT_AND_CANE_FRUIT'
    })

    expect(res.statusCode).toBe(StatusCodes.OK)
    expect(waterManagementHelper.calculateScore).toHaveBeenCalledWith(
      undefined,
      {},
      ['SOFT_AND_CANE_FRUIT'],
      380712,
      396269,
      '5+',
      true,
      'NN'
    )
  })

  it('should return 400 if county is empty string', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/scoring/water-management?county='
    })

    expect(res.statusCode).toBe(StatusCodes.BAD_REQUEST)
  })

  it('should use default values for water-management grant if query is missing', async () => {
    waterManagementHelper.calculateScore.mockResolvedValue({
      totalScore: 100,
      sectorScore: 25,
      scarcityScore: 60,
      collaborationScore: 10,
      planningAbstractionScore: 5
    })

    const res = await server.inject({
      method: 'GET',
      url: '/scoring/water-management'
    })

    expect(res.statusCode).toBe(StatusCodes.OK)
    expect(waterManagementHelper.calculateScore).toHaveBeenCalledWith(
      undefined, // logger
      {}, // db
      ['SOFT_AND_CANE_FRUIT'], // sectorsIrrigated
      380712, // easting (default is number)
      396269, // northing (default is number)
      '5+', // supplyOthers
      true, // planning
      'NN' // abstraction (default)
    )
  })

  it('should return 404 if grant is not water-management', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/scoring/grant-123'
    })

    expect(res.statusCode).toBe(StatusCodes.NOT_FOUND)
    expect(res.result.message).toBe('Unsupported grant')
  })

  it('should return 404 if grant path variable is missing', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/scoring/'
    })

    expect(res.statusCode).toBe(StatusCodes.NOT_FOUND)
  })
})
