import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

const svgStub = resolve(__dirname, 'src/stubs/react-native-svg.tsx')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
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
