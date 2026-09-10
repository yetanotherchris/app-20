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
  window.once('ready-to-show', () => window.show())
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null
  })
  configureWebContents(window)
  loadRenderer(window)
  return window
}

function loadRenderer(window: BrowserWindow): void {
  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  const surface = process.env['APP20_RENDERER_SURFACE']

  if (rendererUrl) {
    const url = surface ? `${rendererUrl}?surface=${encodeURIComponent(surface)}` : rendererUrl
    void window.loadURL(url)
    return
  }

  const file = join(__dirname, '../renderer/index.html')
  if (surface) {
    void window.loadFile(file, { query: { surface } })
    return
  }
  void window.loadFile(file)
}
