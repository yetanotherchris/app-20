import { app } from 'electron'
import { migrateLegacyData } from './appData'
import { isCloseAuthorised, requestClose, resetCloseAuthorisation } from './closeGate'
import { hasConversationFolder, loadConversationFolder } from './conversationFolder'
import { reconcileConversations } from './conversationStore'
import { registerIpcHandlers } from './ipc'
import { buildApplicationMenu } from './menu'
import { runStartupSync } from './sync'
import { createMainWindow, getMainWindow } from './window'

/** A hanging network must not hold the window closed; the run continues after the cap. */
const STARTUP_SYNC_TIMEOUT_MS = 10_000

function withTimeout(promise: Promise<void>, ms: number): Promise<void> {
  return Promise.race([promise, new Promise<void>((resolve) => setTimeout(resolve, ms))])
}

function openWindow(): void {
  const window = createMainWindow()
  window.on('close', (event) => {
    if (isCloseAuthorised()) return
    event.preventDefault()
    requestClose('close')
  })
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const window = getMainWindow()
    if (!window) return
    if (window.isMinimized()) window.restore()
    window.focus()
  })

  app.on('before-quit', (event) => {
    if (isCloseAuthorised() || getMainWindow() === null) return
    event.preventDefault()
    requestClose('quit')
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  void app.whenReady().then(async () => {
    registerIpcHandlers()
    buildApplicationMenu()
    await migrateLegacyData().catch(() => undefined)
    await loadConversationFolder()
    if (hasConversationFolder()) {
      // Best-effort repair so the history is consistent before the window reads
      // it. A failure here must not stop the app from opening; the renderer
      // reconciles again on load and surfaces any folder error.
      await reconcileConversations().catch(() => undefined)
      // Sync before the window opens so session restore (spec 105) starts from
      // settled content; the cap keeps an unreachable network from blocking launch.
      await withTimeout(
        runStartupSync().catch(() => undefined),
        STARTUP_SYNC_TIMEOUT_MS,
      )
    }
    openWindow()

    app.on('activate', () => {
      if (getMainWindow() === null) {
        resetCloseAuthorisation()
        openWindow()
      }
    })
  })
}
