import type { ChatTheme } from './types'

export const lightTheme: ChatTheme = {
  colors: {
    background: '#f8fafc',
    surface: '#ffffff',
    border: '#e2e8f0',
    text: '#0f172a',
    textSecondary: '#475569',
    primary: '#2563eb',
    onPrimary: '#ffffff',
    danger: '#dc2626',
    codeBackground: '#0f172a',
    codeHeader: '#1e293b',
    codeText: '#e2e8f0',
    userBubble: '#2563eb',
    assistantBubble: '#ffffff',
    systemBubble: '#f1f5f9',
    unreadBadge: '#dc2626',
    composerSurface: '#f8fafc',
    composerInput: '#ffffff',
    composerBorder: '#cbd5e1',
    sendDisabled: '#cbd5e1',
    controlSurface: '#2563eb',
  },
  radii: {
    bubbleRadius: 12,
    composerRadius: 18,
    controlRadius: 20,
  },
  spacing: {
    bubbleMarginH: 12,
    bubbleMarginV: 4,
    composerPaddingH: 12,
    composerPaddingV: 8,
  },
  typography: {
    messageTextSize: 14,
    composerTextSize: 14,
    controlTextSize: 14,
    captionTextSize: 12,
  },
}

export const darkTheme: ChatTheme = {
  colors: {
    background: '#0f172a',
    surface: '#1e293b',
    border: '#334155',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    primary: '#3b82f6',
    onPrimary: '#ffffff',
    danger: '#ef4444',
    codeBackground: '#020617',
    codeHeader: '#0f172a',
    codeText: '#e2e8f0',
    userBubble: '#3b82f6',
    assistantBubble: '#1e293b',
    systemBubble: '#1e293b',
    unreadBadge: '#ef4444',
    composerSurface: '#0f172a',
    composerInput: '#1e293b',
    composerBorder: '#334155',
    sendDisabled: '#475569',
    controlSurface: '#3b82f6',
  },
  radii: {
    bubbleRadius: 12,
    composerRadius: 18,
    controlRadius: 20,
  },
  spacing: {
    bubbleMarginH: 12,
    bubbleMarginV: 4,
    composerPaddingH: 12,
    composerPaddingV: 8,
  },
  typography: {
    messageTextSize: 14,
    composerTextSize: 14,
    controlTextSize: 14,
    captionTextSize: 12,
  },
}

export const baseThemes: Record<'light' | 'dark', ChatTheme> = {
  light: lightTheme,
  dark: darkTheme,
}