import { createContext, useContext, useMemo } from 'react'
import { useColorScheme } from 'react-native'
import { resolveTheme, themeBaseForName, type ResolvedThemeBase } from './resolveTheme'
import { lightTheme } from './themes'
import type { ChatTheme, SurfaceStyleOverrides, ThemeInput, ThemeName } from './types'

export interface ThemeContextValue {
  theme: ChatTheme
  themeName: ThemeName
  base: ResolvedThemeBase
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
  styleOverrides: {},
}

const ThemeContext = createContext<ThemeContextValue>(DEFAULT_VALUE)

export interface ThemeProviderProps {
  themeName?: ThemeName
  themeOverride?: ThemeInput
  styleOverrides?: SurfaceStyleOverrides
  children: React.ReactNode
}

export function ThemeProvider({
  themeName = 'system',
  themeOverride,
  styleOverrides = {},
  children,
}: ThemeProviderProps) {
  const colorScheme = useColorScheme()
  const base: ResolvedThemeBase =
    themeName === 'system'
      ? colorScheme === 'dark'
        ? 'dark'
        : 'light'
      : themeBaseForName(themeName)

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: resolveTheme(base, themeOverride),
      themeName,
      base,
      styleOverrides,
    }),
    [base, themeOverride, themeName, styleOverrides],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
