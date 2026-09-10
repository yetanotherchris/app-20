import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const requireFromConfig = createRequire(__filename)
// See apps/electron/electron.vite.config.ts: app-20-llmchat's `development`
// export condition points at a file it does not publish, which breaks Vite dev.
const llmchatEntry = requireFromConfig.resolve('app-20-llmchat')
const svgStub = resolve(__dirname, 'src/stubs/react-native-svg.tsx')

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: [
      { find: 'app-20-llmchat', replacement: llmchatEntry },
      { find: 'react-native', replacement: 'react-native-web' },
      { find: 'react-native-svg', replacement: svgStub },
    ],
  },
  define: {
    global: 'globalThis',
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
  },
})
