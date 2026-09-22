import type { SettingsSnapshot } from '../secrets/secretService'

export interface SettingsPatch {
  apiKey?: string
  s3?: Partial<SettingsSnapshot['s3']>
}

export type SettingsImportResult = { ok: true; patch: SettingsPatch } | { ok: false; error: string }

const MAX_BYTES = 1024 * 1024
const TEXT_KEYS: Record<string, keyof SettingsSnapshot['s3'] | 'apiKey'> = {
  API_KEY: 'apiKey',
  S3_BUCKET: 'bucket',
  S3_REGION: 'region',
  S3_ACCESS_KEY_ID: 'accessKeyId',
  S3_SECRET_ACCESS_KEY: 'secretAccessKey',
  S3_ENDPOINT: 'endpoint',
}

function invalid(error: string): SettingsImportResult {
  return { ok: false, error }
}

function parseJson(raw: string): SettingsImportResult {
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return invalid('Use a JSON settings object.')
    const record = value as Record<string, unknown>
    if (Object.keys(record).some((key) => key !== 'apiKey' && key !== 's3'))
      return invalid('The file contains an unknown setting.')
    if (record.apiKey !== undefined && typeof record.apiKey !== 'string')
      return invalid('API key must be text.')
    if (
      record.s3 !== undefined &&
      (!record.s3 || typeof record.s3 !== 'object' || Array.isArray(record.s3))
    ) {
      return invalid('S3 settings must be an object.')
    }
    const s3 = record.s3 as Record<string, unknown> | undefined
    if (
      s3 &&
      Object.keys(s3).some(
        (key) => !['bucket', 'region', 'accessKeyId', 'secretAccessKey', 'endpoint'].includes(key),
      )
    ) {
      return invalid('The file contains an unknown S3 setting.')
    }
    if (s3 && Object.values(s3).some((entry) => typeof entry !== 'string'))
      return invalid('S3 settings must be text.')
    const s3Patch: Partial<SettingsSnapshot['s3']> = {}
    if (s3) {
      for (const key of [
        'bucket',
        'region',
        'accessKeyId',
        'secretAccessKey',
        'endpoint',
      ] as const) {
        if (typeof s3[key] === 'string') s3Patch[key] = s3[key]
      }
    }
    return {
      ok: true,
      patch: {
        ...(typeof record.apiKey === 'string' ? { apiKey: record.apiKey } : {}),
        ...(s3 ? { s3: s3Patch } : {}),
      },
    }
  } catch {
    return invalid('The JSON file could not be read.')
  }
}

function parseText(raw: string): SettingsImportResult {
  const lines = raw.split(/\r?\n/).filter((line) => line.trim() !== '')
  if (lines.length === 1 && !lines[0]!.includes('='))
    return { ok: true, patch: { apiKey: lines[0]! } }

  const seen = new Set<string>()
  const patch: Partial<SettingsSnapshot['s3']> = {}
  let apiKey: string | undefined
  for (const line of lines) {
    const separator = line.indexOf('=')
    if (separator < 1) return invalid('Use KEY=value lines.')
    const name = line.slice(0, separator).trim()
    const value = line.slice(separator + 1)
    if (seen.has(name)) return invalid('The file contains a duplicate setting.')
    seen.add(name)
    const key = TEXT_KEYS[name]
    if (key === undefined) return invalid('The file contains an unknown setting.')
    if (key === 'apiKey') apiKey = value
    else patch[key] = value
  }
  return {
    ok: true,
    patch: {
      ...(apiKey === undefined ? {} : { apiKey }),
      ...(Object.keys(patch).length ? { s3: patch } : {}),
    },
  }
}

export function parseSettingsImport(name: string, raw: string): SettingsImportResult {
  if (new TextEncoder().encode(raw).byteLength > MAX_BYTES)
    return invalid('The selected file is larger than 1 MiB.')
  const content = raw.replace(/^\uFEFF/, '')
  if (content.trim() === '') return invalid('The selected file is empty.')
  if (name.toLowerCase().endsWith('.json')) return parseJson(content)
  if (name.toLowerCase().endsWith('.txt')) return parseText(content)
  return invalid('Choose a JSON or text settings file.')
}
