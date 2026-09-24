import type { Config } from '@playwright/test'

const config: Config = {
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // The app enforces a single-instance lock, so workers must not launch
  // independent Electron processes at the same time.
  workers: 1,
  retries: 1,
  reporter: 'list',
  use: {
    trace: 'retain-on-failure',
  },
}

export default config
