import { ERROR_MESSAGES, type AppErrorCode } from '../../shared/error-codes'

/**
 * The renderer always renders copy from the code, never the message string the
 * main process sent, so an absolute path cannot reach the UI even by mistake
 * (spec 100 FR-007).
 */
export function messageForCode(code: AppErrorCode): string {
  return ERROR_MESSAGES[code]
}
