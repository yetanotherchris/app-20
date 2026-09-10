export type AppErrorCode =
  | 'no-workspace'
  | 'invalid-name'
  | 'outside-workspace'
  | 'read-failed'
  | 'write-failed'
  | 'chooser-cancelled'
  | 'invalid-secret'
  | 'secret-store-unavailable'
  | 'not-permitted'
  | 'unknown'

export interface Ok<T> {
  ok: true
  value: T
}

export interface Err {
  ok: false
  code: AppErrorCode
  message: string
}

export type Result<T> = Ok<T> | Err

export const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  'no-workspace': 'No workspace folder is open.',
  'invalid-name': 'That file name is not allowed.',
  'outside-workspace': 'That file is outside the workspace folder.',
  'read-failed': 'The file could not be read.',
  'write-failed': 'The file could not be saved.',
  'chooser-cancelled': 'No folder was chosen.',
  'invalid-secret': 'That file is not a valid credential file.',
  'secret-store-unavailable': 'Secure storage is not available on this device.',
  'not-permitted': 'That link cannot be opened.',
  unknown: 'Something went wrong.',
}

export const APP_ERROR_CODES = Object.keys(ERROR_MESSAGES) as AppErrorCode[]
