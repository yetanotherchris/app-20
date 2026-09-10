import { app, ipcMain } from 'electron'
import { promises as fs } from 'node:fs'
import type { Result } from '../shared/error-codes'
import type { IpcChannel, IpcRequest } from '../shared/ipc-contract'
import { atomicWriteFile } from './atomicWrite'
import { resolveClose } from './closeGate'
import { failure, ok } from './errors'
import { assertPathWithinWorkspace, listWorkspaceFileNames } from './paths'
import { getSecretsStatus, importProviderKey, importS3Credentials } from './secrets'
import { openExternalUrl } from './security'
import {
  chooseWorkspace,
  createWorkspace,
  getWorkspaceInfo,
  requireWorkspaceRoot,
} from './workspace'

/**
 * Wraps every Result-returning channel so a thrown AppError becomes a typed,
 * path-free error result instead of a rejected promise carrying a raw message
 * (spec 100 FR-007).
 */
function handle<C extends IpcChannel>(
  channel: C,
  handler: (request: IpcRequest<C>) => Result<unknown> | Promise<Result<unknown>>,
): void {
  ipcMain.handle(channel, async (_event, request: IpcRequest<C>) => {
    try {
      return await handler(request)
    } catch (error) {
      return failure(error)
    }
  })
}

export function registerIpcHandlers(): void {
  handle('app:get-version', () => ok({ version: app.getVersion() }))
  handle('workspace:get', async () => ok(await getWorkspaceInfo()))
  handle('workspace:choose', () => chooseWorkspace())
  handle('workspace:create', () => createWorkspace())
  handle('workspace:list', async () =>
    ok({ names: await listWorkspaceFileNames(await requireWorkspaceRoot()) }),
  )
  handle('file:read', async (request) => {
    const target = await assertPathWithinWorkspace(await requireWorkspaceRoot(), request.name)
    return ok({ content: await fs.readFile(target, 'utf8') })
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

  ipcMain.handle('app:close-decision', (_event, request: IpcRequest<'app:close-decision'>) => {
    resolveClose(request.decision)
  })
}
