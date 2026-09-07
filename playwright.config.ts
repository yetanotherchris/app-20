import type { Config } from '@playwright/test'

const config: Config = {
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: {
    trace: 'retain-on-failure',
  },
}

export default config