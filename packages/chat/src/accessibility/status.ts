import type { ChatStatus, IconName } from '../theme/types'
import type { MessageStatus } from '../types'

export interface StatusPresentation {
  label: string
  icon: IconName
}

export const MESSAGE_STATUS_PRESENTATION: Partial<Record<MessageStatus, StatusPresentation>> = {
  queued: { label: 'Queued', icon: 'queued' },
  sending: { label: 'Sending', icon: 'sending' },
  streaming: { label: 'Streaming', icon: 'streaming' },
  stopped: { label: 'Stopped', icon: 'stopped' },
  error: { label: 'Error', icon: 'error' },
}

export const CHAT_STATUS_PRESENTATION: Partial<Record<ChatStatus, StatusPresentation>> = {
  submitting: { label: 'Submitting…', icon: 'sending' },
  streaming: { label: 'Streaming…', icon: 'streaming' },
  stopping: { label: 'Stopping…', icon: 'stopped' },
  error: { label: 'Error', icon: 'error' },
}
