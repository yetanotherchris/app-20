import type { StyleProp, TextStyle, ViewStyle } from 'react-native'
import type { Message } from '../types'

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

export interface ChatThemeColors {
  background: string
  surface: string
  border: string
  text: string
  textSecondary: string
  primary: string
  onPrimary: string
  danger: string
  codeBackground: string
  codeHeader: string
  codeText: string
  userBubble: string
  assistantBubble: string
  systemBubble: string
  unreadBadge: string
  composerSurface: string
  composerInput: string
  composerBorder: string
  sendDisabled: string
  controlSurface: string
  focus: string
}

export interface ChatThemeRadii {
  bubbleRadius: number
  composerRadius: number
  controlRadius: number
}

export interface ChatThemeSpacing {
  bubbleMarginH: number
  bubbleMarginV: number
  composerPaddingH: number
  composerPaddingV: number
}

export interface ChatThemeTypography {
  messageTextSize: number
  composerTextSize: number
  controlTextSize: number
  captionTextSize: number
}

export interface ChatTheme {
  colors: ChatThemeColors
  radii: ChatThemeRadii
  spacing: ChatThemeSpacing
  typography: ChatThemeTypography
}

export type ThemeInput = DeepPartial<ChatTheme>

export type ThemeName = 'light' | 'dark' | 'system'

export type ContrastMode = 'normal' | 'high'

export type SurfaceName =
  | 'messageList'
  | 'messageBubble'
  | 'composer'
  | 'composerInput'
  | 'send'
  | 'stop'
  | 'scrollToLatest'
  | 'loadEarlier'
  | 'unreadBadge'
  | 'codeBlock'
  | 'empty'
  | 'loading'
  | 'typing'
  | 'error'
  | 'actionMenu'
  | 'messageStatus'
  | 'chatStatus'

export type SurfaceStyleOverrides = Partial<Record<SurfaceName, StyleProp<ViewStyle | TextStyle>>>

export interface MessageAction {
  id: string
  label: string
  group: string
  available?: boolean | ((message: Message) => boolean)
  onAction: (action: MessageAction, message: Message) => void
}

export type IconName =
  | 'send'
  | 'stop'
  | 'scrollToLatest'
  | 'more'
  | 'copy'
  | 'queued'
  | 'sending'
  | 'streaming'
  | 'stopped'
  | 'error'

export type ChatStatus = 'idle' | 'submitting' | 'streaming' | 'stopping' | 'error'

export type CapabilityName = 'send' | 'stop' | 'copy' | 'actions'

export type Capabilities = Partial<Record<CapabilityName, boolean>>

export type ContentTypeKey = 'text.plain' | 'text.markdown'
