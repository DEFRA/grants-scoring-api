import { config } from '#/config.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createServer } from '#/server.js'

export async function startServer() {
  const server = await createServer()
  await server.start()

  insertDataIntoHexagonsCollection(server, 'hexagons.json')

  server.logger.info('Server started successfully')
  server.logger.info(
    `Access your backend on http://localhost:${config.get('port')}`
  )

  return server
}

const insertDataIntoHexagonsCollection = async ({ db, logger }, filename) => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const filePath = path.join(__dirname, 'data', filename)
  try {
    const collection = db.collection('hexagons')

    const count = await collection.countDocuments()
    logger.info(`Hexagons collection currently contains ${count} documents`)

    logger.info(`Importing hexagon data from ${filename}...`)

    const content = await fs.readFile(filePath, 'utf8')
    const data = JSON.parse(content)

    if (Array.isArray(data) && data.length > 0) {
      const result = await collection
        .insertMany(data, { ordered: false })
        .catch((err) => {
          // Ignore duplicate key errors if the data is already there
          if (err.code !== 11000) {
            throw err
          }
          return { insertedCount: err.result?.nInserted || 0 }
        })
      logger.info(
        `Successfully imported ${result.insertedCount || 0} hexagons from ${filename}`
      )
    } else {
      logger.info(`Hexagon data file ${filename} is empty or invalid, skipping`)
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.info(`Hexagon data file ${filename} not found, skipping import`)
    } else {
      logger.error(error, 'Failed to insert data into hexagons collection')
    }
  }
}
