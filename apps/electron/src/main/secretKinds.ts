import type { AppErrorCode } from '../shared/error-codes'
import type { SecretKind } from '../shared/ipc-contract'

export type ValidationResult = { ok: true; value: string } | { ok: false; code: AppErrorCode }

export interface SecretKindDefinition {
  storageKey: string
  validate(raw: string): ValidationResult
}

const MAX_PROVIDER_KEY_CHARS = 8192

/**
 * JSON field names that identify a kind. A file that carries another kind's
 * fields is rejected so one import stores one secret (spec 103 edge cases).
 * The provider-key markers are only consulted when importing a different kind;
 * `apiKey` is included because a JSON object can name a provider key that way.
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

function looksLikeJson(raw: string): boolean {
  const trimmed = raw.trim()
  return trimmed.startsWith('{') || trimmed.startsWith('[')
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

function hasMarker(value: Record<string, unknown>, marker: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, marker)
}

function carriesAnotherKind(kind: SecretKind, value: Record<string, unknown>): boolean {
  return Object.entries(JSON_MARKERS).some(
    ([other, markers]) => other !== kind && markers.some((marker) => hasMarker(value, marker)),
  )
}

function validateProviderKey(raw: string): ValidationResult {
  // A JSON value is never a provider key. If it names another kind's fields it
  // is a multi-secret file; otherwise it is simply the wrong shape. Either way
  // it must not fall through and be stored verbatim.
  if (looksLikeJson(raw)) {
    const json = parseJsonObject(raw)
    return json && carriesAnotherKind('provider-key', json) ? multiple() : invalid()
  }

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
  'provider-key': { storageKey: 'providerKey', validate: validateProviderKey },
  s3: { storageKey: 's3', validate: validateS3Credentials },
}

export function isSecretKind(value: unknown): value is SecretKind {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(SECRET_KINDS, value)
}

export function validateSecret(kind: SecretKind, raw: string): ValidationResult {
  const definition = SECRET_KINDS[kind]
  if (!definition) return invalid()
  return definition.validate(raw)
}
