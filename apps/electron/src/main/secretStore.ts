import { promises as fs } from 'node:fs'
import { dirname } from 'node:path'
import type { SecretKind, SecretsStatus } from '../shared/ipc-contract'
import { atomicWriteFile } from './atomicWrite'
import { AppError } from './errors'
import { SECRET_KINDS, isSecretKind } from './secretKinds'

export interface SecretCipher {
  encrypt(plaintext: string): string
  decrypt(stored: string): string | null
}

export interface SecretStore {
  status(): Promise<SecretsStatus>
  read(kind: SecretKind): Promise<string | null>
  write(kind: SecretKind, plaintext: string): Promise<void>
  remove(kind: SecretKind): Promise<void>
}

type StoredSecrets = Record<string, unknown>

const SECRET_FILE_MODE = 0o600
const SECRET_DIR_MODE = 0o700

/**
 * Creates the store directory if needed and narrows it to the owner. The chmod
 * also fixes a directory an earlier build created at the default umask. The
 * chmod is POSIX-only; Windows does not apply these bits. A failure to prepare
 * the directory is reported as a write failure so the caller does not believe
 * the secret was stored.
 */
async function ensurePrivateDirectory(directory: string): Promise<void> {
  try {
    await fs.mkdir(directory, { recursive: true, mode: SECRET_DIR_MODE })
    if (process.platform !== 'win32') await fs.chmod(directory, SECRET_DIR_MODE)
  } catch {
    throw new AppError('write-failed')
  }
}

/**
 * Reads the on-disk object. Absence is an empty store; a corrupt or
 * non-object file is also treated as empty and replaced by the next write. A
 * read that fails for any other reason is not empty: treating a transient
 * EACCES or EIO as an empty store would let the next write drop the other
 * secrets (constitution III), so it surfaces as `read-failed`.
 */
async function readStored(filePath: string): Promise<StoredSecrets> {
  let raw: string
  try {
    raw = await fs.readFile(filePath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw new AppError('read-failed')
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as StoredSecrets
  } catch {
    return {}
  }
}

function isStoredString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

export function createSecretStore(options: {
  filePath: string
  cipher: SecretCipher
}): SecretStore {
  const { filePath, cipher } = options

  function definitionFor(kind: SecretKind) {
    if (!isSecretKind(kind)) throw new AppError('invalid-secret')
    return SECRET_KINDS[kind]
  }

  // A kind counts as present only when its value decrypts, so `status` never
  // reports a credential the store cannot actually return. An entry written by
  // an earlier build with a different encoding fails here and reads as absent.
  function readEntry(secrets: StoredSecrets, storageKey: string): string | null {
    const stored = secrets[storageKey]
    if (!isStoredString(stored)) return null
    return cipher.decrypt(stored)
  }

  // Serializes each read-modify-write cycle so two overlapping imports or
  // removals cannot read the same snapshot and clobber each other. A failed
  // task does not stall the queue.
  let queue: Promise<unknown> = Promise.resolve()
  function serialize<T>(task: () => Promise<T>): Promise<T> {
    const result = queue.then(task, task)
    queue = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }

  async function setEntry(kind: SecretKind, stored: string | null): Promise<void> {
    const { storageKey } = definitionFor(kind)
    const secrets = await readStored(filePath)

    if (stored === null) {
      if (!Object.prototype.hasOwnProperty.call(secrets, storageKey)) return
      delete secrets[storageKey]
    } else {
      secrets[storageKey] = stored
    }

    // The file is owner read/write only and its directory owner only on POSIX,
    // so another local user cannot read the stored secrets (research.md R1).
    await ensurePrivateDirectory(dirname(filePath))
    await atomicWriteFile(filePath, JSON.stringify(secrets), SECRET_FILE_MODE)
  }

  return {
    async status() {
      const secrets = await readStored(filePath)
      return {
        providerKey: readEntry(secrets, SECRET_KINDS['provider-key'].storageKey) !== null,
        s3: readEntry(secrets, SECRET_KINDS.s3.storageKey) !== null,
      }
    },

    async read(kind) {
      const { storageKey } = definitionFor(kind)
      return readEntry(await readStored(filePath), storageKey)
    },

    async write(kind, plaintext) {
      definitionFor(kind)
      const stored = cipher.encrypt(plaintext)
      await serialize(() => setEntry(kind, stored))
    },

    async remove(kind) {
      definitionFor(kind)
      await serialize(() => setEntry(kind, null))
    },
  }
}
