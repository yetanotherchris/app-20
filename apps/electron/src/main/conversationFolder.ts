import { shell } from 'electron'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { basename } from 'node:path'
import type { AppErrorCode, Result } from '../shared/error-codes'
import type { ConversationFolderInfo } from '../shared/ipc-contract'
import { conversationsDir } from './appData'
import { AppError, err, ok } from './errors'
import { resolveRealRoot } from './paths'

let conversationFolder: string | null = null
let folderError: AppErrorCode | null = null

/**
 * The app owns its conversation folder; the user is never asked to choose one.
 * It lives under the app data directory (`~/.config/app-20/conversations`).
 * Tests and advanced runs override it with APP20_CONVERSATION_DIR or
 * APP20_DATA_DIR. Making the location user-configurable is future work.
 */
function folderInfo(realRoot: string): ConversationFolderInfo {
  return {
    displayName: basename(realRoot),
    id: createHash('sha256').update(realRoot).digest('hex').slice(0, 16),
  }
}

export async function loadConversationFolder(): Promise<void> {
  folderError = null
  conversationFolder = null
  try {
    const target = conversationsDir()
    await fs.mkdir(target, { recursive: true })
    conversationFolder = await resolveRealRoot(target)
  } catch {
    folderError = 'read-failed'
  }
}

export async function requireConversationFolder(): Promise<string> {
  if (!conversationFolder) throw new AppError(folderError ?? 'no-folder')
  return conversationFolder
}

export function hasConversationFolder(): boolean {
  return conversationFolder !== null
}

export async function getConversationFolderInfo(): Promise<Result<ConversationFolderInfo>> {
  if (!conversationFolder) return err(folderError ?? 'read-failed')

  try {
    conversationFolder = await resolveRealRoot(conversationFolder)
    return ok(folderInfo(conversationFolder))
  } catch {
    folderError = 'read-failed'
    return err('read-failed')
  }
}

export async function revealConversationFolder(): Promise<void> {
  const root = await requireConversationFolder()
  const failureMessage = await shell.openPath(root)
  if (failureMessage) throw new AppError('not-permitted')
}
