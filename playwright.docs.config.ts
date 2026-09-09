import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/docs',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: {
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx serve docs/site/dist -l 4173 -s',
    port: 4173,
    reuseExistingServer: true,
  },
})
