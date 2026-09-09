import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

const svgStub = resolve(__dirname, 'src/stubs/react-native-svg.tsx')

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: [
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
