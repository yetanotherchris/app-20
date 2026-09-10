import { ERROR_MESSAGES, type AppErrorCode, type Err, type Ok } from '../shared/error-codes'

export class AppError extends Error {
  readonly code: AppErrorCode

  constructor(code: AppErrorCode) {
    super(ERROR_MESSAGES[code])
    this.name = 'AppError'
    this.code = code
  }
}

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value }
}

export function err(code: AppErrorCode): Err {
  return { ok: false, code, message: ERROR_MESSAGES[code] }
}

export function failure(error: unknown): Err {
  if (error instanceof AppError) return err(error.code)
  return err('unknown')
}
