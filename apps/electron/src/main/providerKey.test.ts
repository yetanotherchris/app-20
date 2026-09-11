import { describe, expect, it } from 'vitest'
import { resolveProviderKey } from './providerKey'

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

  it('returns null when neither source provides a key', () => {
    expect(resolveProviderKey(undefined, null)).toBeNull()
    expect(resolveProviderKey('', null)).toBeNull()
  })
})
