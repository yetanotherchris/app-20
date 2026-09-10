import { shell, type BrowserWindow } from 'electron'
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

function isAppLocation(url: string): boolean {
  if (url.startsWith('file://')) return true
  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  return Boolean(rendererUrl && url.startsWith(rendererUrl))
}

/**
 * Deny-by-default for new windows and navigation. Only http/https reaches the
 * system browser; nothing opens inside the app window (spec 100 FR-011).
 */
export function configureWebContents(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    const parsed = parseHttpUrl(url)
    if (parsed) void shell.openExternal(parsed.toString())
    return { action: 'deny' }
  })

  window.webContents.on('will-navigate', (event, url) => {
    if (isAppLocation(url)) return
    event.preventDefault()
    const parsed = parseHttpUrl(url)
    if (parsed) void shell.openExternal(parsed.toString())
  })
}
