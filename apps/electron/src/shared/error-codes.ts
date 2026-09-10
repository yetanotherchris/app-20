export const APP_ERROR_CODES = [
  'no-folder',
  'invalid-name',
  'outside-folder',
  'read-failed',
  'write-failed',
  'chooser-cancelled',
  'invalid-secret',
  'secret-store-unavailable',
  'conversation-not-found',
  'conversation-corrupt',
  'invalid-conversation',
  'not-permitted',
  'unknown',
] as const

export type AppErrorCode = (typeof APP_ERROR_CODES)[number]

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
  'no-folder': 'No conversation folder is available.',
  'invalid-name': 'That file name is not allowed.',
  'outside-folder': 'That file is outside the conversation folder.',
  'read-failed': 'The file could not be read.',
  'write-failed': 'The file could not be saved.',
  'chooser-cancelled': 'No folder was chosen.',
  'invalid-secret': 'That file is not a valid credential file.',
  'secret-store-unavailable': 'Secure storage is not available on this device.',
  'conversation-not-found': 'That conversation could not be found.',
  'conversation-corrupt': 'That conversation file could not be read.',
  'invalid-conversation': 'That conversation could not be saved.',
  'not-permitted': 'That link cannot be opened.',
  unknown: 'Something went wrong.',
}
