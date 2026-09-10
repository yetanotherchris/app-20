// Dev-mode resolution gate. The production build resolves dependencies with the
// `production`/`default` export conditions, so it cannot catch a package whose
// `development` condition points at an unpublished file (app-20-llmchat). This
// script loads the real renderer config and asks the dev server to transform the
// chat demo, which imports app-20-llmchat; a resolution failure throws.
import { resolve } from 'node:path'
import { createServer, loadConfigFromFile } from 'vite'

const guard = setTimeout(() => {
  console.error('dev:smoke failed: timed out')
  process.exit(1)
}, 60_000)
guard.unref()

const repoRoot = process.cwd()
const configPath = resolve(repoRoot, 'apps/electron/electron.vite.config.ts')
const rendererRoot = resolve(repoRoot, 'apps/electron/src/renderer')

let exitCode = 0
let server

try {
  const loaded = await loadConfigFromFile({ command: 'serve', mode: 'development' }, configPath)
  const rendererConfig = loaded?.config?.renderer ?? {}

  server = await createServer({
    ...rendererConfig,
    root: rendererRoot,
    configFile: false,
    appType: 'custom',
    logLevel: 'silent',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, watch: null },
  })

  const entry = resolve(rendererRoot, 'src/main.tsx')
  await server.transformRequest('/src/main.tsx')

  // This is the assertion that fails when app-20-llmchat's broken
  // `development` export condition is used instead of the published entry.
  const llmchat = await server.pluginContainer.resolveId('app-20-llmchat', entry)
  if (!llmchat) {
    throw new Error('app-20-llmchat did not resolve (the dev server would fail to load it)')
  }
  console.log('dev:smoke passed: app-20-llmchat resolves in serve mode')
} catch (error) {
  console.error('dev:smoke failed:', error instanceof Error ? error.message : error)
  exitCode = 1
} finally {
  await server?.close().catch(() => undefined)
}

process.exit(exitCode)
