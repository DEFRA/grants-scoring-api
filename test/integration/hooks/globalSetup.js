import { type } from 'os'
import { GenericContainer } from 'testcontainers'
import timeSpan from 'time-span'

global.containers = []

export async function setup(_config) {
  console.log('\nsetup started')
  const end = timeSpan()

  const mongoContainer = initializeMongo()

  const startedContainers = await Promise.all([mongoContainer])

  global.containers.push(...startedContainers)

  console.log(`setup done in: ${end.seconds()} seconds`)
}

async function initializeMongo() {
  const mongoContainer = new GenericContainer('mongo:7.0.28').withExposedPorts(
    27017
  )

  if (type() === 'Linux') {
    console.log('mongo: using tmpfs mount')
    mongoContainer.withTmpFs({ '/data/db': '' })
  }

  const mongoStarted = await startContainer(mongoContainer, 'mongodb')

  process.env.MONGO_PORT = mongoStarted.getMappedPort(27017)
  process.env.MONGO_URI = `mongodb://${mongoStarted.getHost()}:${process.env.MONGO_PORT}`

  return mongoStarted
}

async function startContainer(containerBuilder, name) {
  const end = timeSpan()
  const startedContainer = await containerBuilder.start()

  console.log(`${name} started in: ${end.seconds()} seconds`)

  return startedContainer
}
