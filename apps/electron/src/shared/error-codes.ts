export const APP_ERROR_CODES = [
  'no-folder',
  'invalid-name',
  'outside-folder',
  'read-failed',
  'write-failed',
  'chooser-cancelled',
  'invalid-secret',
  'multiple-secrets',
  'secret-store-unavailable',
  'conversation-not-found',
  'conversation-corrupt',
  'invalid-conversation',
  'missing-key',
  'invalid-key',
  'rate-limited',
  'network-error',
  'provider-error',
  'invalid-chat-request',
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
  'multiple-secrets':
    'That file contains more than one kind of secret. Import one secret per file.',
  'secret-store-unavailable': 'Secure storage is not available on this device.',
  'conversation-not-found': 'That conversation could not be found.',
  'conversation-corrupt': 'That conversation file could not be read.',
  'invalid-conversation': 'That conversation could not be saved.',
  'missing-key': 'No provider API key is stored. Import one to continue.',
  'invalid-key': 'The provider API key was rejected.',
  'rate-limited': 'The provider is rate limiting requests. Try again shortly.',
  'network-error': 'The provider could not be reached.',
  'provider-error': 'The provider returned an error.',
  'invalid-chat-request': 'The chat request was invalid.',
  'not-permitted': 'That link cannot be opened.',
  unknown: 'Something went wrong.',
}
