import { app, dialog, safeStorage } from 'electron'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import type { Result } from '../shared/error-codes'
import type { SecretKind, SecretsStatus } from '../shared/ipc-contract'
import { atomicWriteFile } from './atomicWrite'
import { AppError, err, failure, ok } from './errors'

interface StoredSecrets {
  providerKey?: string
  s3?: string
}

function secretsPath(): string {
  return join(app.getPath('userData'), 'secrets.json')
}

async function readStored(): Promise<StoredSecrets> {
  try {
    const raw = await fs.readFile(secretsPath(), 'utf8')
    const parsed: unknown = JSON.parse(raw)
    if (parsed !== null && typeof parsed === 'object') {
      const value = parsed as { providerKey?: unknown; s3?: unknown }
      const stored: StoredSecrets = {}
      if (typeof value.providerKey === 'string') stored.providerKey = value.providerKey
      if (typeof value.s3 === 'string') stored.s3 = value.s3
      return stored
    }
    return {}
  } catch {
    return {}
  }
}

async function writeStored(stored: StoredSecrets): Promise<void> {
  await atomicWriteFile(secretsPath(), JSON.stringify(stored))
}

function encrypt(plaintext: string): string {
  if (!safeStorage.isEncryptionAvailable()) throw new AppError('secret-store-unavailable')
  return safeStorage.encryptString(plaintext).toString('base64')
}

export async function getSecretsStatus(): Promise<SecretsStatus> {
  const stored = await readStored()
  return { providerKey: Boolean(stored.providerKey), s3: Boolean(stored.s3) }
}

async function pickFile(title: string): Promise<string | null> {
  const result = await dialog.showOpenDialog({ title, properties: ['openFile'] })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0] as string
}

async function store(kind: SecretKind, plaintext: string): Promise<Result<{ kind: SecretKind }>> {
  const stored = await readStored()
  if (kind === 'provider-key') stored.providerKey = encrypt(plaintext)
  else stored.s3 = encrypt(plaintext)

  await writeStored(stored)
  return ok({ kind })
}

export async function importProviderKey(): Promise<Result<{ kind: SecretKind }>> {
  const file = await pickFile('Import Provider API Key')
  if (!file) return err('chooser-cancelled')

  try {
    const key = (await fs.readFile(file, 'utf8')).trim()
    if (key.length === 0 || key.length > 8192 || key.includes('\n') || key.includes('\r')) {
      throw new AppError('invalid-secret')
    }
    return await store('provider-key', key)
  } catch (error) {
    return failure(error)
  }
}

export async function importS3Credentials(): Promise<Result<{ kind: SecretKind }>> {
  const file = await pickFile('Import S3 Credentials')
  if (!file) return err('chooser-cancelled')

  try {
    const raw = await fs.readFile(file, 'utf8')
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object') throw new AppError('invalid-secret')

    const value = parsed as { accessKeyId?: unknown; secretAccessKey?: unknown }
    if (typeof value.accessKeyId !== 'string' || value.accessKeyId.trim().length === 0) {
      throw new AppError('invalid-secret')
    }
    if (typeof value.secretAccessKey !== 'string' || value.secretAccessKey.trim().length === 0) {
      throw new AppError('invalid-secret')
    }
    return await store('s3', raw)
  } catch (error) {
    if (error instanceof SyntaxError) return failure(new AppError('invalid-secret'))
    return failure(error)
  }
}
