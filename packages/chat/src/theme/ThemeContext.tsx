import { createContext, useContext, useMemo } from 'react'
import { useColorScheme } from 'react-native'
import { useSystemAccessibility } from '../accessibility/useSystemAccessibility'
import { resolveTheme, themeBaseForName, type ResolvedThemeBase } from './resolveTheme'
import { lightTheme } from './themes'
import type { ContrastMode, ChatTheme, SurfaceStyleOverrides, ThemeInput, ThemeName } from './types'

export interface ThemeContextValue {
  theme: ChatTheme
  themeName: ThemeName
  base: ResolvedThemeBase
  contrast: ContrastMode
  reducedMotion: boolean
  styleOverrides: SurfaceStyleOverrides
}

/**
 * Primitives render with the light theme by default when used outside a
 * ThemeProvider (SC-003: usable with no customization). The top-level Chat
 * component always supplies a provider.
 */
const DEFAULT_VALUE: ThemeContextValue = {
  theme: lightTheme,
  themeName: 'light',
  base: 'light',
  contrast: 'normal',
  reducedMotion: false,
  styleOverrides: {},
}

const ThemeContext = createContext<ThemeContextValue>(DEFAULT_VALUE)

export interface ThemeProviderProps {
  themeName?: ThemeName
  themeOverride?: ThemeInput
  styleOverrides?: SurfaceStyleOverrides
  highContrast?: boolean
  reducedMotion?: boolean
  children: React.ReactNode
}

export function ThemeProvider({
  themeName = 'system',
  themeOverride,
  styleOverrides = {},
  highContrast,
  reducedMotion,
  children,
}: ThemeProviderProps) {
  const colorScheme = useColorScheme()
  const system = useSystemAccessibility({ highContrast, reducedMotion })
  const base: ResolvedThemeBase =
    themeName === 'system'
      ? colorScheme === 'dark'
        ? 'dark'
        : 'light'
      : themeBaseForName(themeName)

  const contrast: ContrastMode = system.highContrast ? 'high' : 'normal'

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: resolveTheme(base, themeOverride, contrast),
      themeName,
      base,
      contrast,
      reducedMotion: system.reducedMotion,
      styleOverrides,
    }),
    [base, themeOverride, contrast, system.reducedMotion, themeName, styleOverrides],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
