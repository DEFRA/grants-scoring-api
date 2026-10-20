import { startServer } from '#/common/helpers/start-server.js'
import { StatusCodes } from 'http-status-codes'

describe('#healthController', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await startServer()
  })

  test('Should provide expected response', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/health'
    })

    expect(result).toEqual({ message: 'success' })
    expect(statusCode).toBe(StatusCodes.OK)
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */