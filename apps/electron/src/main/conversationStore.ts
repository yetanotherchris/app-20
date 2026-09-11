import { promises as fs } from 'node:fs'
import {
  createConversationStore,
  type ConversationFilePort,
  type ConversationStore,
  type ReconcileReport,
} from '@app-20/conversation-storage'
import { atomicWriteFile } from './atomicWrite'
import { requireConversationFolder } from './conversationFolder'
import { AppError } from './errors'
import { assertPathWithinFolder, listFolderFileNames } from './paths'

const MAX_READ_BYTES = 8 * 1024 * 1024
const MAX_WRITE_BYTES = 8 * 1024 * 1024

/**
 * Filesystem port for the store. Names are validated in main against the
 * resolved real conversation folder before any read or write (constitution II),
 * and writes are atomic (constitution III). The store never sees a path.
 */
function createFolderPort(): ConversationFilePort {
  return {
    async listFileNames() {
      return listFolderFileNames(await requireConversationFolder())
    },
    async readText(fileName) {
      const target = await assertPathWithinFolder(await requireConversationFolder(), fileName)
      const stats = await fs.stat(target)
      if (stats.size > MAX_READ_BYTES) throw new AppError('read-failed')
      return fs.readFile(target, 'utf8')
    },
    async writeText(fileName, content) {
      // Bound the write the same way as the read so a save cannot create a file
      // the app can no longer load.
      if (Buffer.byteLength(content, 'utf8') > MAX_WRITE_BYTES) throw new AppError('write-failed')
      const target = await assertPathWithinFolder(await requireConversationFolder(), fileName)
      await atomicWriteFile(target, content)
    },
  }
}

let store: ConversationStore | null = null

export function getConversationStore(): ConversationStore {
  if (!store) store = createConversationStore(createFolderPort())
  return store
}

/** The same path-validated, atomic port the store uses, for the sync engine. */
export function getConversationFilePort(): ConversationFilePort {
  return createFolderPort()
}

export async function reconcileConversations(): Promise<ReconcileReport> {
  return getConversationStore().reconcile()
}
