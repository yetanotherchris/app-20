import { ipcMain } from 'electron'

ipcMain.handle('app:get-version', () => {
  return { version: process.env['npm_package_version'] ?? '0.0.0' }
})
