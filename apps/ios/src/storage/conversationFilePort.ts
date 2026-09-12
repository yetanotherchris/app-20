import * as FileSystem from 'expo-file-system/legacy'
import {
  MANIFEST_FILE_NAME,
  isConversationFileName,
  type ConversationFilePort,
} from '@app-20/conversation-storage'

export interface SandboxFileSystem {
  documentDirectory: string | null
  makeDirectoryAsync(uri: string, options: { intermediates: boolean }): Promise<void>
  readDirectoryAsync(uri: string): Promise<string[]>
  readAsStringAsync(uri: string): Promise<string>
  writeAsStringAsync(uri: string, content: string): Promise<void>
  moveAsync(options: { from: string; to: string }): Promise<void>
  deleteAsync(uri: string, options: { idempotent: boolean }): Promise<void>
}

function isAllowedName(name: string): boolean {
  return name === MANIFEST_FILE_NAME || isConversationFileName(name)
}

function joinUri(directory: string, name: string): string {
  return `${directory.endsWith('/') ? directory : `${directory}/`}${name}`
}

/** Provides atomic, sandboxed file access to the platform-neutral conversation store. */
export function createConversationFilePort(
  fileSystem: SandboxFileSystem = FileSystem,
): ConversationFilePort {
  const root = fileSystem.documentDirectory
  if (!root) throw new Error('Conversation storage is unavailable')
  const directory = joinUri(root, 'conversations')

  async function ensureDirectory(): Promise<void> {
    await fileSystem.makeDirectoryAsync(directory, { intermediates: true })
  }

  function fileUri(name: string): string {
    if (!isAllowedName(name)) throw new Error('Invalid conversation file name')
    return joinUri(directory, name)
  }

  return {
    async listFileNames() {
      await ensureDirectory()
      return fileSystem.readDirectoryAsync(directory)
    },
    async readText(name) {
      await ensureDirectory()
      return fileSystem.readAsStringAsync(fileUri(name))
    },
    async writeText(name, content) {
      await ensureDirectory()
      const destination = fileUri(name)
      const temporary = joinUri(directory, `.${name}.${Date.now()}.tmp`)
      await fileSystem.writeAsStringAsync(temporary, content)
      try {
        await fileSystem.moveAsync({ from: temporary, to: destination })
      } catch (error) {
        await fileSystem.deleteAsync(temporary, { idempotent: true })
        throw error
      }
    },
    async deleteText(name) {
      await ensureDirectory()
      await fileSystem.deleteAsync(fileUri(name), { idempotent: true })
    },
  }
}
