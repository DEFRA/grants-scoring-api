import { StatusCodes } from 'http-status-codes'
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi
} from 'vitest'
import { validateLocation } from './validate-location.js'
import Hapi from '@hapi/hapi'
import { failAction } from '#/common/helpers/fail-action.js'
import * as waterManagementHelper from '#/common/helpers/scoring/water-management.js'

vi.mock(
  '#/common/helpers/scoring/water-management.js',
  async (importOriginal) => {
    const actual = await importOriginal()
    return {
      ...actual,
      pointToHexagon: vi.fn(),
      getHexagonScoreFromDatastore: vi.fn()
    }
  }
)

describe('Validate Location Route', () => {
  let server
  const mockMetrics = {
    counter: vi.fn().mockResolvedValue()
  }

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
    server.decorate('request', 'metrics', mockMetrics)
    server.route(validateLocation)
    await server.initialize()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterAll(async () => {
    await server.stop()
  })

  it('should return 200 if location exists in database', async () => {
    waterManagementHelper.pointToHexagon.mockReturnValue({ q: 1, r: 2 })
    waterManagementHelper.getHexagonScoreFromDatastore.mockResolvedValue(9)

    const res = await server.inject({
      method: 'GET',
      url: '/validate/location?easting=380712&northing=396269'
    })

    expect(res.statusCode).toBe(StatusCodes.OK)
    expect(res.result).toEqual({ message: 'success' })
    expect(waterManagementHelper.pointToHexagon).toHaveBeenCalled()
    expect(
      waterManagementHelper.getHexagonScoreFromDatastore
    ).toHaveBeenCalledWith({}, 1, 2)
    expect(mockMetrics.counter).toHaveBeenCalledWith('validation.success')
  })

  it('should return 400 if location does not exist in database', async () => {
    waterManagementHelper.pointToHexagon.mockReturnValue({ q: 3, r: 4 })
    waterManagementHelper.getHexagonScoreFromDatastore.mockResolvedValue(0)

    const res = await server.inject({
      method: 'GET',
      url: '/validate/location?easting=380712&northing=396269'
    })

    expect(res.statusCode).toBe(StatusCodes.BAD_REQUEST)
    expect(res.result.message).toBe('Location not found')
    expect(mockMetrics.counter).toHaveBeenCalledWith(
      'validation.fail.unsupported_location'
    )
  })

  it('should return 400 if easting is missing', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/validate/location?northing=396269'
    })

    expect(res.statusCode).toBe(StatusCodes.BAD_REQUEST)
    expect(mockMetrics.counter).not.toHaveBeenCalled()
  })

  it('should return 400 if northing is missing', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/validate/location?easting=380712'
    })

    expect(res.statusCode).toBe(StatusCodes.BAD_REQUEST)
    expect(mockMetrics.counter).not.toHaveBeenCalled()
  })
})
