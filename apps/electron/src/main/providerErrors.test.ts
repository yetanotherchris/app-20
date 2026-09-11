import { describe, expect, it } from 'vitest'
import { codeForProviderError } from './providerErrors'

describe('codeForProviderError', () => {
  it('maps each provider class to its app code', () => {
    expect(codeForProviderError('invalid-key')).toBe('invalid-key')
    expect(codeForProviderError('rate-limit')).toBe('rate-limited')
    expect(codeForProviderError('network')).toBe('network-error')
    expect(codeForProviderError('unknown')).toBe('provider-error')
  })
})
