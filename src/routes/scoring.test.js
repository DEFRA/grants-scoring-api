import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { scoring } from './scoring.js'
import Hapi from '@hapi/hapi'
import { failAction } from '#/common/helpers/fail-action.js'

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
    server.route(scoring)
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  it('should return Strong if county is BERKSHIRE', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/scoring/water-management?county=BERKSHIRE'
    })

    expect(res.statusCode).toBe(200)
    expect(res.result).toEqual({ score: 75, band: 'Strong' })
  })

  it('should return Weak if county is BRISTOL', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/scoring/water-management?county=BRISTOL'
    })

    expect(res.statusCode).toBe(200)
    expect(res.result).toEqual({ score: 25, band: 'Weak' })
  })

  it('should return Average if county is CHESHIRE', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/scoring/water-management?county=CHESHIRE'
    })

    expect(res.statusCode).toBe(200)
    expect(res.result).toEqual({ score: 50, band: 'Average' })
  })

  it('should return 400 if county is empty string', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/scoring/water-management?county='
    })

    expect(res.statusCode).toBe(400)
  })

  it('should return Average if county is missing', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/scoring/water-management'
    })

    expect(res.statusCode).toBe(200)
    expect(res.result).toEqual({ score: 50, band: 'Average' })
  })

  it('should return 404 if grant is not water-management', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/scoring/grant-123'
    })

    expect(res.statusCode).toBe(404)
    expect(res.result.message).toBe('Unsupported grant')
  })

  it('should return 400 if grant path variable is missing', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/scoring/'
    })

    expect(res.statusCode).toBe(404)
  })
})
