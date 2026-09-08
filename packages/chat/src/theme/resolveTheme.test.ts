import { describe, expect, it } from 'vitest'
import { resolveTheme, themeBaseForName } from './resolveTheme'
import { baseThemes, highContrastThemes, lightTheme, darkTheme } from './themes'

describe('resolveTheme', () => {
  it('returns the light base when no override is given', () => {
    expect(resolveTheme('light', undefined)).toEqual(lightTheme)
    expect(resolveTheme('dark', undefined)).toEqual(darkTheme)
  })

  it('replaces only the provided keys in a partial override', () => {
    const theme = resolveTheme('light', { colors: { primary: '#ff0000' } })
    expect(theme.colors.primary).toBe('#ff0000')
    // Absent keys fall back to the base.
    expect(theme.colors.text).toBe(lightTheme.colors.text)
    expect(theme.radii).toEqual(lightTheme.radii)
  })

  it('applies nested group overrides without disturbing siblings', () => {
    const theme = resolveTheme('dark', {
      colors: { background: '#000000' },
      radii: { bubbleRadius: 4 },
    })
    expect(theme.colors.background).toBe('#000000')
    expect(theme.colors.surface).toBe(darkTheme.colors.surface)
    expect(theme.radii.bubbleRadius).toBe(4)
    expect(theme.radii.composerRadius).toBe(darkTheme.radii.composerRadius)
  })

  it('merges the layout group like the other token groups', () => {
    const theme = resolveTheme('light', { layout: { readingColumnWidth: 480 } })
    expect(theme.layout.readingColumnWidth).toBe(480)
    expect(theme.layout.composerWidth).toBe(lightTheme.layout.composerWidth)
    expect(theme.layout.sidePadding).toBe(lightTheme.layout.sidePadding)
  })

  it('cannot break on unknown token groups (runtime-safe merge)', () => {
    // Cast simulates an override carrying keys the type does not know about.
    const override = { colors: { notAToken: '#123456' } } as Parameters<typeof resolveTheme>[1]
    const theme = resolveTheme('light', override)
    // Extra keys are inert: every real token keeps its value and no real
    // token is disturbed.
    expect(theme.colors.primary).toBe(lightTheme.colors.primary)
    expect(theme.colors.text).toBe(lightTheme.colors.text)
  })

  it('an explicitly undefined override falls back to the base', () => {
    const theme = resolveTheme('light', { colors: { primary: undefined } })
    expect(theme.colors.primary).toBe(lightTheme.colors.primary)
  })

  it('selects the high-contrast palette when the contrast mode is high', () => {
    expect(resolveTheme('light', undefined, 'high')).toEqual(highContrastThemes.light)
    expect(resolveTheme('dark', undefined, 'high')).toEqual(highContrastThemes.dark)
  })

  it('merges a partial override over the high-contrast base', () => {
    const theme = resolveTheme('dark', { colors: { primary: '#ff0000' } }, 'high')
    expect(theme.colors.primary).toBe('#ff0000')
    expect(theme.colors.background).toBe(highContrastThemes.dark.colors.background)
  })
})

describe('themeBaseForName', () => {
  it('maps theme names to bases', () => {
    expect(themeBaseForName('light')).toBe('light')
    expect(themeBaseForName('dark')).toBe('dark')
    expect(themeBaseForName('system')).toBe('light')
  })

  it('every base theme is registered', () => {
    expect(baseThemes.light).toBeDefined()
    expect(baseThemes.dark).toBeDefined()
  })
})
