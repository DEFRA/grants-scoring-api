import hapi from '@hapi/hapi'

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn().mockResolvedValue('[]'),
    readdir: vi.fn().mockResolvedValue([])
  }
}))

vi.mock('mongodb', () => {
  const mockCollection = {
    countDocuments: vi.fn().mockResolvedValue(0),
    insertMany: vi.fn().mockResolvedValue({ insertedCount: 0 }),
    createIndex: vi.fn().mockResolvedValue({}),
    createIndexes: vi.fn().mockResolvedValue({})
  }
  const mockDb = {
    collection: vi.fn().mockReturnValue(mockCollection)
  }
  const mockClient = {
    db: vi.fn().mockReturnValue(mockDb),
    close: vi.fn().mockResolvedValue({})
  }
  return {
    MongoClient: {
      connect: vi.fn().mockResolvedValue(mockClient)
    }
  }
})

describe('#startServer', () => {
  let createServerSpy
  let hapiServerSpy
  let startServerImport
  let createServerImport

  beforeAll(async () => {
    vi.stubEnv('PORT', '3098')

    createServerImport = await import('#/server.js')
    startServerImport = await import('./start-server.js')

    createServerSpy = vi.spyOn(createServerImport, 'createServer')
    hapiServerSpy = vi.spyOn(hapi, 'server')
  })

  afterAll(() => {
    vi.resetAllMocks()
  })

  describe('When server starts', () => {
    test('Should start up server as expected', async () => {
      await startServerImport.startServer()

      expect(createServerSpy).toHaveBeenCalled()
      expect(hapiServerSpy).toHaveBeenCalled()
    })
  })

  describe('When server start fails', () => {
    test('Should log failed startup message', async () => {
      createServerSpy.mockRejectedValue(new Error('Server failed to start'))

      await expect(startServerImport.startServer()).rejects.toThrow(
        'Server failed to start'
      )
    })
  })
})
