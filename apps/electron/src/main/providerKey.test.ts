import { describe, expect, it } from 'vitest'
import { hasProviderKey, resolveProviderKey } from './providerKey'

describe('resolveProviderKey', () => {
  it('uses the environment value when present', () => {
    expect(resolveProviderKey('sk-env', 'sk-stored')).toBe('sk-env')
  })

  it('trims the environment value', () => {
    expect(resolveProviderKey('  sk-env\n', null)).toBe('sk-env')
  })

  it('falls back to the stored key when the environment value is absent', () => {
    expect(resolveProviderKey(undefined, 'sk-stored')).toBe('sk-stored')
  })

  it('falls back to the stored key when the environment value is blank', () => {
    expect(resolveProviderKey('   ', 'sk-stored')).toBe('sk-stored')
  })

  it('falls back to the stored key when the environment value is malformed', () => {
    expect(resolveProviderKey('sk env', 'sk-stored')).toBe('sk-stored')
    expect(resolveProviderKey('{"providerKey":"sk-env"}', 'sk-stored')).toBe('sk-stored')
  })

  it('returns null when neither source provides a key', () => {
    expect(resolveProviderKey(undefined, null)).toBeNull()
    expect(resolveProviderKey('', null)).toBeNull()
  })
})

describe('hasProviderKey', () => {
  it('is true when either source supplies a key', () => {
    expect(hasProviderKey('sk-env', null)).toBe(true)
    expect(hasProviderKey(undefined, 'sk-stored')).toBe(true)
  })

  it('is false when neither source supplies a key', () => {
    expect(hasProviderKey(undefined, null)).toBe(false)
    expect(hasProviderKey('   ', null)).toBe(false)
  })
})
