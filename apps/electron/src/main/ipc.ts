import { app, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { parseConversation } from '@app-20/conversation-storage'
import type { Result } from '../shared/error-codes'
import type { IpcChannel, IpcRequest } from '../shared/ipc-contract'
import { startChat, stopChat } from './chatStream'
import { resolveClose } from './closeGate'
import { getConversationFolderInfo, revealConversationFolder } from './conversationFolder'
import { getConversationStore } from './conversationStore'
import { AppError, failure, ok } from './errors'
import { getSecretsStatus, importProviderKey, importS3Credentials, removeSecret } from './secrets'
import { openExternalUrl } from './security'
import { getMainWindow } from './window'

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
  handle('folder:get', () => getConversationFolderInfo())
  handle('folder:reveal', async () => {
    await revealConversationFolder()
    return ok({})
  })
  handle('conversations:list', async () => ok(await getConversationStore().list()))
  handle('conversations:read', async (request) => {
    const load = await getConversationStore().read(request.id)
    if (load.kind === 'ok') return ok({ conversation: load.conversation })
    throw new AppError(load.kind === 'corrupt' ? 'conversation-corrupt' : 'conversation-not-found')
  })
  handle('conversations:save', async (request) => {
    const conversation = parseConversation(request.conversation)
    if (!conversation) throw new AppError('invalid-conversation')
    await getConversationStore().save(conversation)
    return ok({ savedAt: conversation.updatedAt })
  })
  handle('chat:start', (request) => startChat(request))
  handle('chat:stop', (request) => {
    stopChat(request.requestId)
    return ok({})
  })
  handle('secrets:import-provider-key', () => importProviderKey())
  handle('secrets:import-s3', () => importS3Credentials())
  handle('secrets:remove', (request) => removeSecret(request.kind))
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
