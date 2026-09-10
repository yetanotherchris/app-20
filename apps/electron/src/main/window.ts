import { BrowserWindow } from 'electron'
import { join } from 'node:path'
import type { IpcEventChannel, IpcEventPayload } from '../shared/ipc-contract'
import { configureWebContents } from './security'

let mainWindow: BrowserWindow | null = null

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function sendToRenderer<C extends IpcEventChannel>(
  channel: C,
  payload: IpcEventPayload<C>,
): void {
  const window = mainWindow
  if (window && !window.isDestroyed()) {
    window.webContents.send(channel, payload)
  }
}

export function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow = window
  // Show without activating: launching the app must not steal focus from
  // whatever the user is doing. The click on the window itself focuses it.
  window.once('ready-to-show', () => window.showInactive())
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null
  })
  configureWebContents(window)
  loadRenderer(window)
  return window
}

function loadRenderer(window: BrowserWindow): void {
  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (rendererUrl) {
    void window.loadURL(rendererUrl)
    return
  }
  void window.loadFile(join(__dirname, '../renderer/index.html'))
}
