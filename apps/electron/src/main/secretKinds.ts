import type { AppErrorCode } from '../shared/error-codes'
import type { SecretKind } from '../shared/ipc-contract'

export type ValidationResult = { ok: true; value: string } | { ok: false; code: AppErrorCode }

export interface SecretKindDefinition {
  kind: SecretKind
  storageKey: string
  validate(raw: string): ValidationResult
}

const MAX_PROVIDER_KEY_CHARS = 8192

function invalid(): ValidationResult {
  return { ok: false, code: 'invalid-secret' }
}

function validateProviderKey(raw: string): ValidationResult {
  const value = raw.trim()
  if (
    value.length === 0 ||
    value.length > MAX_PROVIDER_KEY_CHARS ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return invalid()
  }
  return { ok: true, value }
}

function validateS3Credentials(raw: string): ValidationResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return invalid()
  }
  if (parsed === null || typeof parsed !== 'object') return invalid()

  const value = parsed as { accessKeyId?: unknown; secretAccessKey?: unknown }
  if (typeof value.accessKeyId !== 'string' || value.accessKeyId.trim().length === 0) {
    return invalid()
  }
  if (typeof value.secretAccessKey !== 'string' || value.secretAccessKey.trim().length === 0) {
    return invalid()
  }
  return { ok: true, value: raw }
}

/**
 * The registry of credential kinds. A new kind is a new entry with its own
 * storage key and validator; existing entries are untouched, so adding a kind
 * never rewrites stored secrets or runs a migration (spec 103 FR-006).
 */
export const SECRET_KINDS: Record<SecretKind, SecretKindDefinition> = {
  'provider-key': {
    kind: 'provider-key',
    storageKey: 'providerKey',
    validate: validateProviderKey,
  },
  s3: { kind: 's3', storageKey: 's3', validate: validateS3Credentials },
}

export function isSecretKind(value: unknown): value is SecretKind {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(SECRET_KINDS, value)
}

export function validateSecret(kind: SecretKind, raw: string): ValidationResult {
  return SECRET_KINDS[kind].validate(raw)
}
