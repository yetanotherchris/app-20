import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

const requireFromConfig = createRequire(__filename)
// app-20-llmchat ships a `development` export condition that points at
// `src/index.ts`, which is not in its published files. Vite's dev server
// prefers that condition and fails to resolve the package, while the
// production build uses `default` and works. Pin the published entry.
const llmchatEntry = requireFromConfig.resolve('app-20-llmchat')
const svgStub = resolve(__dirname, 'src/renderer/src/stubs/react-native-svg.tsx')

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ')

// Injected only for the production build: a file:// document is not covered by
// webRequest.onHeadersReceived, and the dev server needs its HMR websocket.
function contentSecurityPolicyPlugin(): Plugin {
  return {
    name: 'app20-content-security-policy',
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      handler() {
        return [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
            injectTo: 'head-prepend',
          },
        ]
      },
    },
  }
}

export default defineConfig({
  main: {
    build: {
      outDir: 'out/main',
      // The conversation storage and provider packages are source-only
      // TypeScript with no build step, so they must be bundled into main rather
      // than required at runtime.
      externalizeDeps: {
        exclude: ['@app-20/conversation-storage', '@app-20/ai-provider', '@app-20/sync'],
      },
    },
  },
  preload: {
    build: {
      outDir: 'out/preload',
    },
  },
  renderer: {
    plugins: [react(), contentSecurityPolicyPlugin()],
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
      outDir: 'out/renderer',
    },
  },
})
