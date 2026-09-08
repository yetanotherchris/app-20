import { baseThemes } from './themes'
import type { ChatTheme, ThemeInput, ThemeName } from './types'

export type ResolvedThemeBase = 'light' | 'dark'

function mergeSection<T extends object>(base: T, override: Partial<T> | undefined): T {
  if (!override) return base
  const filtered: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(override)) {
    // An explicitly undefined override must fall back to the base rather than
    // replace it (contracts/theme.md resolution rules).
    if (value !== undefined) {
      filtered[key] = value
    }
  }
  return { ...base, ...filtered }
}

function mergeTheme(base: ChatTheme, override: ThemeInput | undefined): ChatTheme {
  if (!override) return base
  return {
    colors: mergeSection(base.colors, override.colors),
    radii: mergeSection(base.radii, override.radii),
    spacing: mergeSection(base.spacing, override.spacing),
    typography: mergeSection(base.typography, override.typography),
  }
}

/**
 * Resolve the active theme from a name and an optional partial override.
 * Base is light or dark; when the name is 'system' the caller supplies the
 * resolved base. Absent override keys fall back to the base; unknown keys are
 * not expressible in the ThemeInput type and cannot break rendering.
 */
export function resolveTheme(base: ResolvedThemeBase, override: ThemeInput | undefined): ChatTheme {
  return mergeTheme(baseThemes[base], override)
}

export function themeBaseForName(name: ThemeName): ResolvedThemeBase {
  return name === 'dark' ? 'dark' : 'light'
}
