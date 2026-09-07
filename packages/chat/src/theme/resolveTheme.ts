import { baseThemes } from './themes'
import type { ChatTheme, ThemeInput, ThemeName } from './types'

export type ResolvedThemeBase = 'light' | 'dark'

function mergeTheme(base: ChatTheme, override: ThemeInput | undefined): ChatTheme {
  if (!override) return base
  return {
    colors: { ...base.colors, ...override.colors },
    radii: { ...base.radii, ...override.radii },
    spacing: { ...base.spacing, ...override.spacing },
    typography: { ...base.typography, ...override.typography },
  }
}

/**
 * Resolve the active theme from a name and an optional partial override.
 * Base is light or dark; when the name is 'system' the caller supplies the
 * resolved base. Absent override keys fall back to the base; unknown keys are
 * not expressible in the ThemeInput type and cannot break rendering.
 */
export function resolveTheme(
  base: ResolvedThemeBase,
  override: ThemeInput | undefined,
): ChatTheme {
  return mergeTheme(baseThemes[base], override)
}

export function themeBaseForName(name: ThemeName): ResolvedThemeBase {
  return name === 'dark' ? 'dark' : 'light'
}