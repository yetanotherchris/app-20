import { describe, expect, it } from 'vitest'
import { APP_ERROR_CODES } from '../../shared/error-codes'
import { messageForCode } from './errorMessages'

function looksLikeAbsolutePath(text: string): boolean {
  return /[A-Za-z]:\\/.test(text) || /(?:^|\s)\/(?:home|Users|root|etc|var)\//.test(text)
}

describe('messageForCode', () => {
  it('returns a non-empty, path-free message for every code', () => {
    for (const code of APP_ERROR_CODES) {
      const message = messageForCode(code)
      expect(message.length).toBeGreaterThan(0)
      expect(looksLikeAbsolutePath(message)).toBe(false)
    }
  })
})

describe('looksLikeAbsolutePath', () => {
  it('detects Windows and POSIX absolute paths', () => {
    expect(looksLikeAbsolutePath('C:\\Users\\chris\\secret.txt')).toBe(true)
    expect(looksLikeAbsolutePath('/home/chris/secret.txt')).toBe(true)
    expect(looksLikeAbsolutePath('/etc/passwd')).toBe(true)
  })

  it('does not flag ordinary copy', () => {
    expect(looksLikeAbsolutePath('No workspace folder is open.')).toBe(false)
  })
})
