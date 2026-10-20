import { defineConfig, configDefaults } from 'vitest/config'

const hooksPath = './test/integration/hooks/'
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    clearMocks: true,
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.js', 'test/**/*.js'],
      exclude: [...configDefaults.exclude, 'coverage', 'test/integration/hooks/**']
    },
    setupFiles: ['.vite/mongo-memory-server.js', '.vite/setup-files.js'],
    globalSetup: [
        `${hooksPath}globalSetup.js`,
        `${hooksPath}globalTeardown.js`
      ],
    hookTimeout: 120000
  }
})
