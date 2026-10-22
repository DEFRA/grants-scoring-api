import { config } from '#/config.js'

import { createServer } from '#/server.js'
import { insertDataIntoHexagonsCollection } from '#/common/helpers/insert-hexagons.js'

export async function startServer() {
  const server = await createServer()
  await server.start()

  insertDataIntoHexagonsCollection(server)

  server.logger.info('Server started successfully')
  server.logger.info(
    `Access your backend on http://localhost:${config.get('port')}`
  )

  return server
}
