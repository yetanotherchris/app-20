import { shell, type BrowserWindow, type Event as ElectronEvent } from 'electron'
import { AppError } from './errors'

function parseHttpUrl(url: string): URL | null {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed
    return null
  } catch {
    return null
  }
}

export async function openExternalUrl(url: string): Promise<void> {
  const parsed = parseHttpUrl(url)
  if (!parsed) throw new AppError('not-permitted')
  await shell.openExternal(parsed.toString())
}

function isDevOrigin(url: string): boolean {
  const devBase = process.env['ELECTRON_RENDERER_URL']
  if (!devBase) return false
  try {
    return new URL(url).origin === new URL(devBase).origin
  } catch {
    return false
  }
}

/**
 * Deny-by-default for new windows and navigation. Only the exact app document
 * (a reload) and the dev-server origin are allowed to stay; every other URL is
 * either blocked or, for http/https, handed to the system browser. Treating all
 * `file://` as trusted would let a local HTML file replace the window and gain
 * the preload bridge (spec 100 FR-011).
 */
export function configureWebContents(window: BrowserWindow): void {
  const contents = window.webContents

  contents.setWindowOpenHandler(({ url }) => {
    const parsed = parseHttpUrl(url)
    if (parsed) void shell.openExternal(parsed.toString())
    return { action: 'deny' }
  })

  const guard = (event: ElectronEvent, url: string): void => {
    if (url === contents.getURL() || isDevOrigin(url)) return
    event.preventDefault()
    const parsed = parseHttpUrl(url)
    if (parsed) void shell.openExternal(parsed.toString())
  }

  contents.on('will-navigate', guard)
  contents.on('will-redirect', guard)
}
