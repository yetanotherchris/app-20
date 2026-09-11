import type { ConversationFilePort } from '@app-20/conversation-storage'
import type { SyncRemote } from '@app-20/sync'
import type { SyncStatus } from '../shared/ipc-contract'
import { getConversationFilePort } from './conversationStore'
import { createS3Remote } from './s3Remote'
import { getS3Config } from './secrets'
import { createSyncService } from './syncService'
import { sendToRenderer } from './window'

/**
 * The Electron binding of the sync service. The S3 client is built here so the
 * service stays free of Electron and the AWS SDK; the resolved credential is
 * read per run so an import or removal takes effect on the next trigger. The
 * status event is dropped before the window exists; the renderer reads the
 * current status on mount.
 */
const service = createSyncService({
  async resolveRemote(): Promise<SyncRemote | null> {
    const config = await getS3Config()
    return config ? createS3Remote(config) : null
  },
  resolveLocal(): ConversationFilePort {
    return getConversationFilePort()
  },
  push(status: SyncStatus): void {
    sendToRenderer('sync:status', status)
  },
})

export function getSyncStatus(): SyncStatus {
  return service.getStatus()
}

/** Queue a background sync after a completed local save. */
export function scheduleSync(): void {
  service.schedule()
}

/** Run one sync before the window opens so restore starts from settled content. */
export async function runStartupSync(): Promise<void> {
  await service.runStartup()
}
