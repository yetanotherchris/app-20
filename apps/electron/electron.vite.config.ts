import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { webPlatformResolution } from '../../packages/chat/src/vite/web-platform-resolution'

export default defineConfig({
  main: {
    build: {
      outDir: 'out/main',
    },
  },
  preload: {
    build: {
      outDir: 'out/preload',
    },
  },
  renderer: {
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
      outDir: 'out/renderer',
    },
  },
})