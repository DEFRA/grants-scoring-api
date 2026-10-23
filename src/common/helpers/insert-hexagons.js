import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { acquireLock } from '#/common/helpers/mongo-lock.js'

const MONGODB_DUPLICATE_KEY_ERROR_CODE = 11000

export const insertDataIntoHexagonsCollection = async (server) => {
  const { db, locker, logger } = server

  const lock = await acquireLock(locker, 'insert-hexagons', logger)

  if (!lock) {
    logger.info('Hexagon data import already in progress or handled by another instance')
    return
  }

  const dirname = path.dirname(fileURLToPath(import.meta.url))
  const dataDir = path.join(dirname, 'data')
  try {
    const collection = db.collection('hexagons')

    const count = await collection.countDocuments()
    logger.info(`Hexagons collection currently contains ${count} documents`)

    const files = (await fs.readdir(dataDir)).filter((f) => f.endsWith('.json'))

    for (const filename of files) {
      const filePath = path.join(dataDir, filename)
      logger.info(`Importing hexagon data from ${filename}...`)

      const content = await fs.readFile(filePath, 'utf8')
      const data = JSON.parse(content)

      if (Array.isArray(data) && data.length > 0) {
        const result = await collection
          .insertMany(data, { ordered: false })
          .catch(ignoreDuplicateKeyError)
        logger.info(
          `Successfully imported ${result.insertedCount || 0} hexagons from ${filename}`
        )
      } else {
        logger.info(
          `Hexagon data file ${filename} is empty or invalid, skipping`
        )
      }
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.info(`Hexagon data directory not found, skipping import`)
    } else {
      logger.error(error, 'Failed to insert data into hexagons collection')
    }
  } finally {
    if (lock) {
      await lock.release()
    }
  }
}

const ignoreDuplicateKeyError = (err) => {
  // Ignore duplicate key errors if the data is already there
  if (err.code !== MONGODB_DUPLICATE_KEY_ERROR_CODE) {
    throw err
  }
  return { insertedCount: err.result?.nInserted || 0 }
}
