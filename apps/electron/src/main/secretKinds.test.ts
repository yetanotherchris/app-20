import { describe, expect, it } from 'vitest'
import { isSecretKind, SECRET_KINDS, validateSecret } from './secretKinds'

describe('provider key validation', () => {
  it('accepts a single token and returns it trimmed', () => {
    const result = validateSecret('provider-key', '  sk-or-v1-abc  ')
    expect(result).toEqual({ ok: true, value: 'sk-or-v1-abc' })
  })

  it('accepts a file that ends with a newline', () => {
    expect(validateSecret('provider-key', 'sk-or-v1-abc\n')).toEqual({
      ok: true,
      value: 'sk-or-v1-abc',
    })
  })

  it('accepts a file with surrounding blank lines', () => {
    expect(validateSecret('provider-key', '\n\n sk-or-v1-abc \n\n')).toEqual({
      ok: true,
      value: 'sk-or-v1-abc',
    })
  })

  it('rejects an empty file', () => {
    expect(validateSecret('provider-key', '   ').ok).toBe(false)
  })

  it('rejects a token longer than the cap', () => {
    expect(validateSecret('provider-key', 'x'.repeat(8193)).ok).toBe(false)
  })

  it('rejects a second line', () => {
    expect(validateSecret('provider-key', 'first\nsecond').ok).toBe(false)
  })

  it('never echoes rejected material back in the result', () => {
    const result = validateSecret('provider-key', 'sk-secret-value\nsecond')
    expect(result).toEqual({ ok: false, code: 'invalid-secret' })
    expect(JSON.stringify(result)).not.toContain('sk-secret-value')
  })

  it('rejects internal whitespace', () => {
    expect(validateSecret('provider-key', 'sk-or key').ok).toBe(false)
  })

  it('rejects a JSON file as a provider key', () => {
    expect(validateSecret('provider-key', '{"apiKey":"sk-or"}')).toEqual({
      ok: false,
      code: 'invalid-secret',
    })
  })

  it('rejects a JSON array as a provider key', () => {
    expect(validateSecret('provider-key', '[{"accessKeyId":"a","secretAccessKey":"b"}]')).toEqual({
      ok: false,
      code: 'invalid-secret',
    })
  })

  it('rejects an S3 file imported as a provider key with multiple-secrets', () => {
    expect(
      validateSecret('provider-key', JSON.stringify({ accessKeyId: 'a', secretAccessKey: 'b' })),
    ).toEqual({ ok: false, code: 'multiple-secrets' })
  })
})

describe('s3 credential validation', () => {
  it('accepts a pair and round-trips its fields', () => {
    const result = validateSecret(
      's3',
      JSON.stringify({ accessKeyId: 'AKIA', secretAccessKey: 'secret' }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(JSON.parse(result.value)).toEqual({ accessKeyId: 'AKIA', secretAccessKey: 'secret' })
    }
  })

  it('rejects a non-JSON file', () => {
    expect(validateSecret('s3', 'not json').ok).toBe(false)
  })

  it('rejects a missing or non-string field', () => {
    expect(validateSecret('s3', JSON.stringify({ accessKeyId: 5 })).ok).toBe(false)
    expect(
      validateSecret('s3', JSON.stringify({ accessKeyId: 'AKIA', secretAccessKey: ' ' })).ok,
    ).toBe(false)
  })

  it('trims and stores only the credential fields', () => {
    const result = validateSecret(
      's3',
      JSON.stringify({ accessKeyId: ' AKIA ', secretAccessKey: ' secret ', region: 'eu' }),
    )
    expect(result).toEqual({
      ok: true,
      value: JSON.stringify({ accessKeyId: 'AKIA', secretAccessKey: 'secret' }),
    })
  })

  it('rejects a file that also carries a provider key with multiple-secrets', () => {
    expect(
      validateSecret(
        's3',
        JSON.stringify({ accessKeyId: 'a', secretAccessKey: 'b', providerKey: 'sk' }),
      ),
    ).toEqual({ ok: false, code: 'multiple-secrets' })
  })
})

describe('kind registry', () => {
  it('maps each kind to a distinct storage key', () => {
    const keys = Object.values(SECRET_KINDS).map((definition) => definition.storageKey)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('recognises known kinds only', () => {
    expect(isSecretKind('provider-key')).toBe(true)
    expect(isSecretKind('s3')).toBe(true)
    expect(isSecretKind('token')).toBe(false)
    expect(isSecretKind(7)).toBe(false)
  })
})
