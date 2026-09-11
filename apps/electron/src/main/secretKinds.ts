import type { AppErrorCode } from '../shared/error-codes'
import type { SecretKind } from '../shared/ipc-contract'

export type ValidationResult = { ok: true; value: string } | { ok: false; code: AppErrorCode }

export interface SecretKindDefinition {
  kind: SecretKind
  storageKey: string
  validate(raw: string): ValidationResult
}

const MAX_PROVIDER_KEY_CHARS = 8192

/**
 * JSON field names that identify a kind. A file that carries another kind's
 * fields is rejected so one import stores one secret (spec 103 edge cases).
 */
const JSON_MARKERS: Record<SecretKind, readonly string[]> = {
  'provider-key': ['providerKey', 'apiKey'],
  s3: ['accessKeyId', 'secretAccessKey'],
}

function invalid(): ValidationResult {
  return { ok: false, code: 'invalid-secret' }
}

function multiple(): ValidationResult {
  return { ok: false, code: 'multiple-secrets' }
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('{')) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return null
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  return parsed as Record<string, unknown>
}

function carriesAnotherKind(kind: SecretKind, value: Record<string, unknown>): boolean {
  return Object.entries(JSON_MARKERS).some(
    ([other, markers]) => other !== kind && markers.some((marker) => marker in value),
  )
}

function validateProviderKey(raw: string): ValidationResult {
  const json = parseJsonObject(raw)
  if (json) return carriesAnotherKind('provider-key', json) ? multiple() : invalid()

  const value = raw.trim()
  if (value.length === 0 || value.length > MAX_PROVIDER_KEY_CHARS || /\s/.test(value)) {
    return invalid()
  }
  return { ok: true, value }
}

function validateS3Credentials(raw: string): ValidationResult {
  const json = parseJsonObject(raw)
  if (!json) return invalid()
  if (carriesAnotherKind('s3', json)) return multiple()

  const { accessKeyId, secretAccessKey } = json
  if (typeof accessKeyId !== 'string' || accessKeyId.trim().length === 0) return invalid()
  if (typeof secretAccessKey !== 'string' || secretAccessKey.trim().length === 0) return invalid()

  const normalized = {
    accessKeyId: accessKeyId.trim(),
    secretAccessKey: secretAccessKey.trim(),
  }
  return { ok: true, value: JSON.stringify(normalized) }
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
