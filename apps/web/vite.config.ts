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
  resolve: {
    alias: [
      { find: 'app-20-llmchat', replacement: llmchatEntry },
      { find: 'react-native', replacement: 'react-native-web' },
      // The chat component never renders SVG on web (FR-007); stubbing avoids
      // bundling react-native-svg's Fabric source, which imports react-native
      // modules react-native-web does not provide and which Vite's dev
      // optimizer cannot pre-bundle.
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
