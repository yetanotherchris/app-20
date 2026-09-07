import { describe, expect, it } from 'vitest'
import { resolveTheme, themeBaseForName } from './resolveTheme'
import { baseThemes, lightTheme, darkTheme } from './themes'

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

  it('cannot break on unknown token groups (runtime-safe merge)', () => {
    // Cast simulates an override carrying keys the type does not know about.
    const override = { colors: { notAToken: '#123456' } } as Parameters<typeof resolveTheme>[1]
    const theme = resolveTheme('light', override)
    // Unknown key is ignored; the theme object still has every real token.
    expect(theme.colors.primary).toBe(lightTheme.colors.primary)
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
