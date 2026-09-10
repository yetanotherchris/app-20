import { app, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { promises as fs } from 'node:fs'
import type { Result } from '../shared/error-codes'
import type { IpcChannel, IpcRequest } from '../shared/ipc-contract'
import { atomicWriteFile } from './atomicWrite'
import { resolveClose } from './closeGate'
import { AppError, failure, ok } from './errors'
import { assertPathWithinWorkspace, listWorkspaceFileNames } from './paths'
import { getSecretsStatus, importProviderKey, importS3Credentials } from './secrets'
import { openExternalUrl } from './security'
import {
  chooseWorkspace,
  createWorkspace,
  getWorkspaceInfo,
  requireWorkspaceRoot,
} from './workspace'
import { getMainWindow } from './window'

const MAX_READ_BYTES = 8 * 1024 * 1024

function isTrustedSender(event: IpcMainInvokeEvent): boolean {
  const window = getMainWindow()
  return Boolean(window && !window.isDestroyed() && event.sender === window.webContents)
}

/**
 * Wraps every Result-returning channel so a thrown AppError becomes a typed,
 * path-free error result instead of a rejected promise carrying a raw message
 * (spec 100 FR-007). A request from any frame other than the main window is
 * refused.
 */
function handle<C extends IpcChannel>(
  channel: C,
  handler: (request: IpcRequest<C>) => Result<unknown> | Promise<Result<unknown>>,
): void {
  ipcMain.handle(channel, async (event, request: IpcRequest<C>) => {
    if (!isTrustedSender(event)) return failure(new AppError('not-permitted'))
    try {
      return await handler(request)
    } catch (error) {
      return failure(error)
    }
  })
}

function handleVoid<C extends IpcChannel>(
  channel: C,
  handler: (request: IpcRequest<C>) => void,
): void {
  ipcMain.handle(channel, (event, request: IpcRequest<C>) => {
    if (!isTrustedSender(event)) return
    handler(request)
  })
}

export function registerIpcHandlers(): void {
  handle('app:get-version', () => ok({ version: app.getVersion() }))
  handle('workspace:get', () => getWorkspaceInfo())
  handle('workspace:choose', () => chooseWorkspace())
  handle('workspace:create', () => createWorkspace())
  handle('workspace:list', async () =>
    ok({ names: await listWorkspaceFileNames(await requireWorkspaceRoot()) }),
  )
  handle('file:read', async (request) => {
    const target = await assertPathWithinWorkspace(await requireWorkspaceRoot(), request.name)
    try {
      const stats = await fs.stat(target)
      if (stats.size > MAX_READ_BYTES) throw new AppError('read-failed')
      return ok({ content: await fs.readFile(target, 'utf8') })
    } catch (error) {
      if (error instanceof AppError) throw error
      throw new AppError('read-failed')
    }
  })
  handle('file:write', async (request) => {
    const target = await assertPathWithinWorkspace(await requireWorkspaceRoot(), request.name)
    await atomicWriteFile(target, request.content)
    return ok({ savedAt: new Date().toISOString() })
  })
  handle('secrets:import-provider-key', () => importProviderKey())
  handle('secrets:import-s3', () => importS3Credentials())
  handle('secrets:status', async () => ok(await getSecretsStatus()))
  handle('shell:open-external', async (request) => {
    await openExternalUrl(request.url)
    return ok({})
  })
  handleVoid('app:close-decision', (request) => {
    if (request.decision === 'close' || request.decision === 'cancel') {
      resolveClose(request.decision)
    }
  })
}
