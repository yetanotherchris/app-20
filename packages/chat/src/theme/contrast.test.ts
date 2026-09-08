import { describe, expect, it } from 'vitest'
import { relativeLuminance, contrastRatio } from './contrast'
import { baseThemes, highContrastThemes } from './themes'
import type { ChatTheme } from './types'

const NORMAL_TEXT_MIN = 4.5
const UI_COMPONENT_MIN = 3

interface ContrastPair {
  fg: string
  bg: string
  min: number
}

function assertThemePairs(name: string, theme: ChatTheme): void {
  const pairs: ContrastPair[] = [
    { fg: theme.colors.text, bg: theme.colors.surface, min: NORMAL_TEXT_MIN },
    { fg: theme.colors.textSecondary, bg: theme.colors.surface, min: NORMAL_TEXT_MIN },
    { fg: theme.colors.onPrimary, bg: theme.colors.primary, min: NORMAL_TEXT_MIN },
    { fg: theme.colors.userBubbleText, bg: theme.colors.userBubble, min: NORMAL_TEXT_MIN },
    { fg: theme.colors.onPrimary, bg: theme.colors.sendBackground, min: NORMAL_TEXT_MIN },
    { fg: theme.colors.sendForeground, bg: theme.colors.sendBackground, min: NORMAL_TEXT_MIN },
    { fg: theme.colors.codeText, bg: theme.colors.codeBackground, min: NORMAL_TEXT_MIN },
    { fg: theme.colors.codeText, bg: theme.colors.codeHeader, min: NORMAL_TEXT_MIN },
    { fg: theme.colors.danger, bg: theme.colors.surface, min: NORMAL_TEXT_MIN },
    { fg: theme.colors.focus, bg: theme.colors.surface, min: UI_COMPONENT_MIN },
    {
      fg: theme.colors.composerBorderFocus,
      bg: theme.colors.composerSurface,
      min: UI_COMPONENT_MIN,
    },
    { fg: theme.colors.unreadBadge, bg: theme.colors.background, min: UI_COMPONENT_MIN },
  ]
  for (const pair of pairs) {
    const ratio = contrastRatio(pair.fg, pair.bg)
    expect(ratio, `${name}: ${pair.fg} on ${pair.bg}`).toBeGreaterThanOrEqual(pair.min)
  }
}

describe('contrast helpers', () => {
  it('computes relative luminance per WCAG', () => {
    expect(relativeLuminance('#000000')).toBe(0)
    expect(relativeLuminance('#ffffff')).toBe(1)
    expect(relativeLuminance('#0f172a')).toBeGreaterThan(0)
    expect(relativeLuminance('#0f172a')).toBeLessThan(1)
  })

  it('computes the expected ratio for black on white', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeGreaterThanOrEqual(21)
  })

  it('default light and dark themes meet the required pairs', () => {
    for (const name of ['light', 'dark'] as const) {
      assertThemePairs(name, baseThemes[name])
    }
  })

  it('high-contrast themes meet the required pairs, including dark', () => {
    for (const name of ['light', 'dark'] as const) {
      assertThemePairs(`${name}-high-contrast`, highContrastThemes[name])
    }
  })
})
