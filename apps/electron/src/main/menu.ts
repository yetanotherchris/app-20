import { app, Menu, type MenuItemConstructorOptions } from 'electron'
import type { MenuCommand } from '../shared/ipc-contract'
import { sendToRenderer } from './window'

function dispatch(command: MenuCommand): void {
  sendToRenderer('menu:command', { command })
}

export function buildApplicationMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Import Provider API Key...',
          accelerator: 'CmdOrCtrl+K',
          click: () => dispatch('import-provider-key'),
        },
        {
          label: 'Import S3 Credentials...',
          accelerator: 'CmdOrCtrl+Shift+K',
          click: () => dispatch('import-s3-credentials'),
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => dispatch('save-document'),
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'Conversations',
      submenu: [
        {
          label: 'Show Conversations Folder',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => dispatch('reveal-workspace'),
        },
        { type: 'separator' },
        {
          label: 'New Conversation',
          accelerator: 'CmdOrCtrl+N',
          click: () => dispatch('new-conversation'),
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
