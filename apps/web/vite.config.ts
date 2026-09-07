import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
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
    outDir: resolve(__dirname, 'dist'),
  },
})
