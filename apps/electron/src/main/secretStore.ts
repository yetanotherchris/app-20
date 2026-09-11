import { promises as fs } from 'node:fs'
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

function hasEntry(secrets: StoredSecrets, storageKey: string): boolean {
  return isStoredString(secrets[storageKey])
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

    await atomicWriteFile(filePath, JSON.stringify(secrets))
  }

  return {
    async status() {
      const secrets = await readStored(filePath)
      return {
        providerKey: hasEntry(secrets, SECRET_KINDS['provider-key'].storageKey),
        s3: hasEntry(secrets, SECRET_KINDS.s3.storageKey),
      }
    },

    async read(kind) {
      const { storageKey } = definitionFor(kind)
      const stored = (await readStored(filePath))[storageKey]
      if (!isStoredString(stored)) return null
      return cipher.decrypt(stored)
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
