import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

/**
 * Packaged-artifact vitest project (FR-015). Imports the built
 * `@app-20/chat` entry (dist/index.js, resolved via the package exports
 * `default` condition) rather than the source files. Run via
 * `npm run test:package`, which builds the package first.
 */
export default defineConfig({
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      'react-native-svg': resolve(__dirname, 'packages/chat/src/vite/stubs/react-native-svg.tsx'),
      '@app-20/chat': resolve(__dirname, 'packages/chat/dist/index.js'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['tests/package/**/*.test.{ts,tsx}'],
    setupFiles: [resolve(__dirname, 'vitest.setup.ts')],
  },
})
