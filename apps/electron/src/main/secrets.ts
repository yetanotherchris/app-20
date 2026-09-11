import { dialog, safeStorage } from 'electron'
import { randomBytes } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { dirname } from 'node:path'
import type { Result } from '../shared/error-codes'
import type { SecretKind, SecretsStatus } from '../shared/ipc-contract'
import { decryptWithPassphrase, encryptWithPassphrase } from './ageCipher'
import { atomicWriteFile } from './atomicWrite'
import { passphraseFilePath, secretsFilePath } from './appData'
import { AppError, err, failure, ok } from './errors'
import { SECRET_FILE_MODE, ensurePrivateDirectory } from './privateFile'
import { validateSecret } from './secretKinds'
import { createSecretStore, type SecretStore } from './secretStore'

const MAX_SECRET_BYTES = 64 * 1024
const PASSPHRASE_BYTES = 32

let storagePrepared = false

/**
 * Linux without a keyring selects the `basic_text` backend, where
 * `isEncryptionAvailable()` stays false until the in-memory password fallback
 * is enabled. `setUsePlainTextEncryption` is a no-op when a real password
 * manager is present and on Windows and macOS. research.md R1 records that the
 * fallback is accepted so secret import works on Linux.
 */
function prepareStorage(): void {
  if (storagePrepared) return
  storagePrepared = true
  if (process.platform === 'linux' && !safeStorage.isEncryptionAvailable()) {
    safeStorage.setUsePlainTextEncryption(true)
  }
}

function requireStorage(): void {
  prepareStorage()
  if (!safeStorage.isEncryptionAvailable()) throw new AppError('secret-store-unavailable')
}

let passphrasePromise: Promise<string> | null = null

/**
 * Reads the vault-protected passphrase, or null when none has been created.
 * Reads never create one: an absent passphrase means there is no readable
 * payload, so the store treats it as empty.
 */
async function readPassphrase(): Promise<string | null> {
  requireStorage()

  let stored: string
  try {
    stored = await fs.readFile(passphraseFilePath(), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw new AppError('read-failed')
  }

  try {
    const value = safeStorage.decryptString(Buffer.from(stored, 'base64'))
    if (value.length === 0) throw new Error('empty passphrase')
    return value
  } catch {
    throw new AppError('read-failed')
  }
}

/**
 * Returns the passphrase, creating and vault-protecting one on first use. The
 * in-flight promise is shared so two concurrent first writes cannot generate
 * two passphrases, which would leave one payload undecryptable. A failed
 * creation clears the promise so a later attempt can retry.
 */
function getOrCreatePassphrase(): Promise<string> {
  if (!passphrasePromise) {
    passphrasePromise = createPassphrase().catch((error: unknown) => {
      passphrasePromise = null
      throw error
    })
  }
  return passphrasePromise
}

async function createPassphrase(): Promise<string> {
  const existing = await readPassphrase()
  if (existing) return existing

  const created = randomBytes(PASSPHRASE_BYTES).toString('base64url')
  await ensurePrivateDirectory(dirname(passphraseFilePath()))
  await atomicWriteFile(
    passphraseFilePath(),
    safeStorage.encryptString(created).toString('base64'),
    SECRET_FILE_MODE,
  )
  return created
}

const cipher = {
  async encrypt(plaintext: string): Promise<string> {
    const passphrase = await getOrCreatePassphrase()
    try {
      return await encryptWithPassphrase(passphrase, plaintext)
    } catch (error) {
      if (error instanceof AppError) throw error
      throw new AppError('write-failed')
    }
  },
  async decrypt(ciphertext: string): Promise<string | null> {
    const passphrase = await readPassphrase()
    if (!passphrase) return null
    return decryptWithPassphrase(passphrase, ciphertext)
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
