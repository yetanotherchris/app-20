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
    focus: '#2563eb',
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
    // Dark text on the primary-colored controls: white on #3b82f6 measures
    // 3.68:1, below the 4.5:1 normal-text requirement (research R4).
    onPrimary: '#0f172a',
    // #f87171 keeps 4.5:1 on the dark surfaces when used as text (research R4).
    danger: '#f87171',
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
    focus: '#60a5fa',
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

export const lightHighContrastTheme: ChatTheme = {
  colors: {
    background: '#ffffff',
    surface: '#ffffff',
    border: '#000000',
    text: '#000000',
    textSecondary: '#000000',
    primary: '#000000',
    onPrimary: '#ffffff',
    danger: '#a00000',
    codeBackground: '#000000',
    codeHeader: '#000000',
    codeText: '#ffffff',
    userBubble: '#000000',
    assistantBubble: '#ffffff',
    systemBubble: '#ffffff',
    unreadBadge: '#000000',
    composerSurface: '#ffffff',
    composerInput: '#ffffff',
    composerBorder: '#000000',
    sendDisabled: '#767676',
    controlSurface: '#000000',
    focus: '#000000',
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

export const darkHighContrastTheme: ChatTheme = {
  colors: {
    background: '#000000',
    surface: '#000000',
    border: '#ffffff',
    text: '#ffffff',
    textSecondary: '#e6e6e6',
    primary: '#ffffff',
    onPrimary: '#000000',
    danger: '#ff7b72',
    codeBackground: '#000000',
    codeHeader: '#1a1a1a',
    codeText: '#ffffff',
    userBubble: '#ffffff',
    assistantBubble: '#000000',
    systemBubble: '#000000',
    unreadBadge: '#ffffff',
    composerSurface: '#000000',
    composerInput: '#000000',
    composerBorder: '#ffffff',
    sendDisabled: '#767676',
    controlSurface: '#ffffff',
    focus: '#ffffff',
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

export const highContrastThemes: Record<'light' | 'dark', ChatTheme> = {
  light: lightHighContrastTheme,
  dark: darkHighContrastTheme,
}
