import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { webPlatformResolution } from '../../packages/chat/src/vite/web-platform-resolution'

export default defineConfig({
  plugins: [react(), webPlatformResolution()],
  resolve: {
    alias: [
      { find: 'react-native', replacement: 'react-native-web' },
      { find: 'react-native-svg', replacement: 'react-native-svg/src/index.ts' },
    ],
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    // react-native-svg uses Metro-style .web platform resolution; the dev
    // optimizer (esbuild) cannot resolve its Fabric deep imports, so process
    // it through Vite's normal pipeline where webPlatformResolution applies.
    exclude: ['react-native-svg'],
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
  },
})