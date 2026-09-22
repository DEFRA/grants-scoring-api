import Hapi from '@hapi/hapi'
import { StatusCodes } from 'http-status-codes'
import { serviceAuth } from './service-auth.js'
import { config } from '../config.js'

vi.mock('../config.js')

vi.mock('../common/helpers/logging/logger.js', () => {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  return {
    createLogger: vi.fn(() => logger)
  }
})

describe('serviceAuth plugin', () => {
  const defaultConfigValues = {
    'serviceAuth.enabled': true,
    'serviceAuth.allowedServices': '',
    'serviceAuth.jwksUri': 'http://jwks',
    'serviceAuth.audience': 'test-audience',
    'serviceAuth.issuer': 'test-issuer',
    cdpEnvironment: 'prod',
    serviceName: 'test'
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    config.get.mockImplementation((key) => defaultConfigValues[key] ?? null)
  })

  describe('jwt auth validate', () => {
    let capturedValidate

    const setupMockServer = async () => {
      const mockServer = {
        register: vi.fn(),
        ext: vi.fn(),
        auth: {
          strategy: vi.fn((name, type, options) => {
            if (name === 'service-jwt') capturedValidate = options.validate
          }),
          scheme: vi.fn(),
          default: vi.fn()
        }
      }
      await serviceAuth.plugin.register(mockServer)
      return mockServer
    }

    it('should validate a correct token', async () => {
      await setupMockServer()
      const res = await capturedValidate({
        decoded: { payload: { sub: 's/test' } }
      })
      expect(res.isValid).toBe(true)
      expect(res.credentials).toEqual({ sub: 's/test', serviceName: 'test' })
    })

    it('should reject tokens missing the sub claim', async () => {
      await setupMockServer()
      await expect(
        async () => await capturedValidate({ decoded: { payload: {} } })
      ).rejects.toThrow()
    })

    it('should reject services not in the allowed list', async () => {
      config.get.mockImplementation((key) => {
        if (key === 'serviceAuth.allowedServices') return 'other'
        return defaultConfigValues[key] ?? null
      })

      await setupMockServer()
      await expect(
        async () =>
          await capturedValidate({ decoded: { payload: { sub: 's/test' } } })
      ).rejects.toThrow()
    })
  })

  describe('subject-based access control', () => {
    it('should allow access if serviceName is in allowedSubjects', async () => {
      const server = Hapi.server()
      config.get.mockImplementation((key) => {
        if (key === 'cdpEnvironment') return 'local'
        return defaultConfigValues[key] ?? null
      })
      await server.register(serviceAuth)

      server.route({
        method: 'GET',
        path: '/restricted',
        handler: () => 'ok',
        options: {
          auth: 'service',
          plugins: { 'service-auth': { allowedSubjects: ['grants-ui'] } }
        }
      })

      const res = await server.inject({ method: 'GET', url: '/restricted' })
      expect(res.statusCode).toBe(StatusCodes.OK)
      await server.stop()
    })

    it('should deny access if serviceName is not in allowedSubjects', async () => {
      const server = Hapi.server()
      await server.register(serviceAuth)

      server.auth.scheme('test-scheme', () => ({
        authenticate: (request, h) =>
          h.authenticated({ credentials: { serviceName: 'unauthorized' } })
      }))
      server.auth.strategy('test-strat', 'test-scheme')

      server.route({
        method: 'GET',
        path: '/restricted',
        handler: () => 'ok',
        options: {
          auth: 'test-strat',
          plugins: { 'service-auth': { allowedSubjects: ['grants-ui'] } }
        }
      })

      const res = await server.inject({ method: 'GET', url: '/restricted' })
      expect(res.statusCode).toBe(StatusCodes.FORBIDDEN)
      await server.stop()
    })

    it('should deny access if serviceName is missing from credentials', async () => {
      const server = Hapi.server()
      await server.register(serviceAuth)

      server.auth.scheme('test-scheme', () => ({
        authenticate: (request, h) => h.authenticated({ credentials: {} })
      }))
      server.auth.strategy('test-strat', 'test-scheme')

      server.route({
        method: 'GET',
        path: '/restricted',
        handler: () => 'ok',
        options: {
          auth: 'test-strat',
          plugins: { 'service-auth': { allowedSubjects: ['grants-ui'] } }
        }
      })

      const res = await server.inject({ method: 'GET', url: '/restricted' })
      expect(res.statusCode).toBe(StatusCodes.FORBIDDEN)
      await server.stop()
    })
  })

  describe('service-custom scheme', () => {
    it('should bypass auth in local environment', async () => {
      const server = Hapi.server()
      config.get.mockImplementation((key) => {
        if (key === 'cdpEnvironment') return 'local'
        return defaultConfigValues[key] ?? null
      })
      await server.register(serviceAuth)
      server.route({
        method: 'GET',
        path: '/t',
        handler: () => 'ok',
        options: { auth: 'service' }
      })
      const res = await server.inject({ method: 'GET', url: '/t' })
      expect(res.statusCode).toBe(StatusCodes.OK)
      await server.stop()
    })

    it('should return 401 if Authorization header is missing in prod', async () => {
      const server = Hapi.server()
      config.get.mockImplementation((key) => {
        if (key === 'cdpEnvironment') return 'prod'
        return defaultConfigValues[key] ?? null
      })
      await server.register(serviceAuth)
      server.route({
        method: 'GET',
        path: '/t',
        handler: () => 'ok',
        options: { auth: 'service' }
      })
      const res = await server.inject({ method: 'GET', url: '/t' })
      expect(res.statusCode).toBe(StatusCodes.UNAUTHORIZED)
      await server.stop()
    })

    it('should return 401 if Authorization header is malformed', async () => {
      const server = Hapi.server()
      config.get.mockImplementation((key) => {
        if (key === 'cdpEnvironment') return 'prod'
        return defaultConfigValues[key] ?? null
      })
      await server.register(serviceAuth)
      server.route({
        method: 'GET',
        path: '/t',
        handler: () => 'ok',
        options: { auth: 'service' }
      })
      const res = await server.inject({
        method: 'GET',
        url: '/t',
        headers: { authorization: 'Basic 123' }
      })
      expect(res.statusCode).toBe(StatusCodes.UNAUTHORIZED)
      await server.stop()
    })

    it('should call server.auth.test when valid Bearer token is provided', async () => {
      const server = Hapi.server()
      config.get.mockImplementation((key) => {
        if (key === 'cdpEnvironment') return 'prod'
        if (key === 'serviceAuth.enabled') return false
        return defaultConfigValues[key] ?? null
      })

      await server.register(serviceAuth)

      // Register a dummy scheme for 'service-jwt' so auth.test doesn't throw "Unknown authentication strategy"
      server.auth.scheme('dummy-jwt', () => ({
        authenticate: (request, h) =>
          h.authenticated({ credentials: { serviceName: 'test-service' } })
      }))
      server.auth.strategy('service-jwt', 'dummy-jwt')

      server.route({
        method: 'GET',
        path: '/t',
        handler: (request) => request.auth.credentials,
        options: { auth: 'service' }
      })

      const res = await server.inject({
        method: 'GET',
        url: '/t',
        headers: { authorization: 'Bearer xxx.yyy.zzz' }
      })

      expect(res.statusCode).toBe(StatusCodes.OK)
      expect(res.result).toMatchObject({
        serviceName: 'test-service',
        authenticated: true,
        type: 'jwt'
      })
      await server.stop()
    })
  })
})
