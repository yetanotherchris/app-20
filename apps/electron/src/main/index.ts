import { app } from 'electron'
import { isCloseAuthorised, requestClose, resetCloseAuthorisation } from './closeGate'
import { registerIpcHandlers } from './ipc'
import { buildApplicationMenu } from './menu'
import { createMainWindow, getMainWindow } from './window'
import { loadWorkspace } from './workspace'

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
    await loadWorkspace()
    openWindow()

    app.on('activate', () => {
      if (getMainWindow() === null) {
        resetCloseAuthorisation()
        openWindow()
      }
    })
  })
}
