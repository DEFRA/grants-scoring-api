import { startServer } from '#/common/helpers/start-server.js'
import { StatusCodes } from 'http-status-codes'

describe('#validateLocationController', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await startServer()

    // Insert a test hexagon to ensure we can have a "true" result
    // easting: 380712, northing: 396269 maps to q: 4396, r: 1765
    await server.db.collection('hexagons').insertOne({
      q: 4396,
      r: 1765,
      score: 5
    })
  })

  test('should return locationFound: true for a valid location in England', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/validate/location?easting=380712&northing=396269'
    })

    expect(statusCode).toBe(StatusCodes.OK)
    expect(result).toEqual({
      message: 'success',
      locationFound: true
    })
  })

  test('should return locationFound: false for a location outside England', async () => {
    // Coordinates that should map to a different q, r not in our DB
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/validate/location?easting=0&northing=0'
    })

    expect(statusCode).toBe(StatusCodes.OK)
    expect(result).toEqual({
      message: 'success',
      locationFound: false
    })
  })

  test('should return 400 Bad Request if easting is missing', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/validate/location?northing=396269'
    })

    expect(statusCode).toBe(StatusCodes.BAD_REQUEST)
    expect(result.error).toBe('Bad Request')
    expect(result.message).toContain('"easting" is required')
  })

  test('should return 400 Bad Request if northing is missing', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/validate/location?easting=380712'
    })

    expect(statusCode).toBe(StatusCodes.BAD_REQUEST)
    expect(result.error).toBe('Bad Request')
    expect(result.message).toContain('"northing" is required')
  })

  test('should return 400 Bad Request if coordinates are not numbers', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/validate/location?easting=abc&northing=def'
    })

    expect(statusCode).toBe(StatusCodes.BAD_REQUEST)
    expect(result.error).toBe('Bad Request')
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
