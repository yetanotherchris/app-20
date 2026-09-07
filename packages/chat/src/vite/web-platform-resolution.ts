import type { Plugin } from 'vite'
import { dirname, resolve } from 'node:path'
import { existsSync } from 'node:fs'

const WEB_EXTENSIONS = ['.web.tsx', '.web.ts', '.web.jsx', '.web.js']

/**
 * Applies Metro-style platform resolution inside node_modules for the web
 * target: when a relative import has no `.web` variant and a `.web.*` file
 * exists next to it, resolve the `.web` file. react-native-svg ships `.web`
 * sources but its web entry still imports `./elements` (not `./elements.web`),
 * which only Metro resolves to the web variant. Without this, Vite bundles the
 * Fabric entry that imports modules react-native-web does not provide.
 */
export function webPlatformResolution(): Plugin {
  return {
    name: 'app20:web-platform-resolution',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (!importer || !source.startsWith('.')) return null
      const importerDir = dirname(importer)
      if (!importer.includes('node_modules')) return null
      for (const ext of WEB_EXTENSIONS) {
        const candidate = resolve(importerDir, source + ext)
        if (existsSync(candidate)) return candidate
      }
      return null
    },
  }
}