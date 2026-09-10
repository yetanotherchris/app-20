import type { Config } from '@playwright/test'

const config: Config = {
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Electron launches run in parallel; one retry absorbs startup contention
  // flakiness without weakening any assertion.
  retries: 1,
  reporter: 'list',
  use: {
    trace: 'retain-on-failure',
  },
}

export default config