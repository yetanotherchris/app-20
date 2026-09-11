import { dialog, safeStorage } from 'electron'
import { promises as fs } from 'node:fs'
import type { Result } from '../shared/error-codes'
import type { SecretKind, SecretsStatus } from '../shared/ipc-contract'
import { secretsFilePath } from './appData'
import { AppError, err, failure, ok } from './errors'
import { validateSecret } from './secretKinds'
import { createSecretStore, type SecretStore } from './secretStore'

const MAX_SECRET_BYTES = 64 * 1024

const cipher = {
  encrypt(plaintext: string): string {
    if (!safeStorage.isEncryptionAvailable()) throw new AppError('secret-store-unavailable')
    return safeStorage.encryptString(plaintext).toString('base64')
  },
  decrypt(stored: string): string | null {
    try {
      return safeStorage.decryptString(Buffer.from(stored, 'base64'))
    } catch {
      return null
    }
  },
}

let store: SecretStore | null = null

/**
 * The store is bound to the app data path on first use so an environment
 * override set before startup is honoured. The plaintext of a secret is
 * produced and consumed here in main only (spec 103 FR-005).
 */
function secretStore(): SecretStore {
  if (!store) store = createSecretStore({ filePath: secretsFilePath(), cipher })
  return store
}

export async function getSecretsStatus(): Promise<SecretsStatus> {
  return secretStore().status()
}

/**
 * Decrypts the stored provider key for the main-process provider only. The
 * plaintext never leaves this process and is never logged or returned to the
 * renderer (spec 103 FR-005). An absent or unreadable secret returns null.
 */
export async function getProviderKey(): Promise<string | null> {
  return secretStore().read('provider-key')
}

async function pickFile(title: string): Promise<string | null> {
  const result = await dialog.showOpenDialog({ title, properties: ['openFile'] })
  const chosen = result.filePaths[0]
  if (result.canceled || !chosen) return null
  return chosen
}

async function readCapped(filePath: string): Promise<string> {
  const stats = await fs.stat(filePath)
  if (stats.size > MAX_SECRET_BYTES) throw new AppError('invalid-secret')
  return fs.readFile(filePath, 'utf8')
}

async function importSecret(
  kind: SecretKind,
  filePath: string,
): Promise<Result<{ kind: SecretKind }>> {
  const validation = validateSecret(kind, await readCapped(filePath))
  if (!validation.ok) throw new AppError(validation.code)
  await secretStore().write(kind, validation.value)
  return ok({ kind })
}

async function importWithChooser(
  kind: SecretKind,
  title: string,
): Promise<Result<{ kind: SecretKind }>> {
  const file = await pickFile(title)
  if (!file) return err('chooser-cancelled')

  try {
    return await importSecret(kind, file)
  } catch (error) {
    return failure(error)
  }
}

export function importProviderKey(): Promise<Result<{ kind: SecretKind }>> {
  return importWithChooser('provider-key', 'Import Provider API Key')
}

export function importS3Credentials(): Promise<Result<{ kind: SecretKind }>> {
  return importWithChooser('s3', 'Import S3 Credentials')
}

/**
 * Removes a stored secret. Removing a kind that is not stored succeeds, so a
 * repeated menu action is not an error (spec 103 research R4). An unknown kind
 * is refused by the store. The dependent feature then fails through its
 * missing-credential path until a new secret is imported.
 */
export async function removeSecret(kind: SecretKind): Promise<Result<{ kind: SecretKind }>> {
  try {
    await secretStore().remove(kind)
    return ok({ kind })
  } catch (error) {
    return failure(error)
  }
}
