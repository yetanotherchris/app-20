import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      'react-native': 'react-native-web',
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    passWithNoTests: true,
    include: ['packages/**/*.test.{ts,tsx}', 'apps/**/*.test.{ts,tsx}'],
    setupFiles: [resolve(__dirname, 'vitest.setup.ts')],
  },
})
