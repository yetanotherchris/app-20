import { describe, expect, it } from 'vitest'
import { APP_ERROR_CODES, ERROR_MESSAGES } from '../shared/error-codes'

const WINDOWS_PATH = /[A-Za-z]:\\/
const POSIX_HOME = /\/(?:home|Users|root)\//

describe('error code contract', () => {
  it('exposes a closed, duplicate-free set of codes', () => {
    expect(new Set(APP_ERROR_CODES).size).toBe(APP_ERROR_CODES.length)
    expect([...APP_ERROR_CODES].sort()).toEqual(Object.keys(ERROR_MESSAGES).sort())
  })

  it('has a non-empty, path-free message for every code', () => {
    for (const code of APP_ERROR_CODES) {
      const message = ERROR_MESSAGES[code]
      expect(message.length).toBeGreaterThan(0)
      expect(WINDOWS_PATH.test(message)).toBe(false)
      expect(POSIX_HOME.test(message)).toBe(false)
    }
  })
})
