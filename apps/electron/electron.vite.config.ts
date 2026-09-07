import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

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
    plugins: [react()],
    resolve: {
      alias: {
        'react-native': 'react-native-web',
      },
    },
    define: {
      global: 'globalThis',
    },
    build: {
      outDir: 'out/renderer',
    },
  },
})
