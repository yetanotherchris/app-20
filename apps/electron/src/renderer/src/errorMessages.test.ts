import { describe, expect, it } from 'vitest'
import { APP_ERROR_CODES } from '../../shared/error-codes'
import { containsAbsolutePath, messageForCode } from './errorMessages'

describe('messageForCode', () => {
  it('returns a non-empty, path-free message for every code', () => {
    for (const code of APP_ERROR_CODES) {
      const message = messageForCode(code)
      expect(message.length).toBeGreaterThan(0)
      expect(containsAbsolutePath(message)).toBe(false)
    }
  })
})

describe('containsAbsolutePath', () => {
  it('detects Windows and POSIX absolute paths', () => {
    expect(containsAbsolutePath('C:\\Users\\chris\\secret.txt')).toBe(true)
    expect(containsAbsolutePath('/home/chris/secret.txt')).toBe(true)
  })

  it('does not flag ordinary copy', () => {
    expect(containsAbsolutePath('No workspace folder is open.')).toBe(false)
  })
})
