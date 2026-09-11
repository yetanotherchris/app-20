import type { ProviderErrorClass } from '@app-20/ai-provider'
import type { AppErrorCode } from '../shared/error-codes'

const PROVIDER_ERROR_CODES: Record<ProviderErrorClass, AppErrorCode> = {
  'invalid-key': 'invalid-key',
  'rate-limit': 'rate-limited',
  network: 'network-error',
  unknown: 'provider-error',
}

export function codeForProviderError(errorClass: ProviderErrorClass): AppErrorCode {
  return PROVIDER_ERROR_CODES[errorClass]
}
