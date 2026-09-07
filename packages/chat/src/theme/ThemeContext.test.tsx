import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider, useTheme } from './ThemeContext'
import { lightTheme, darkTheme } from './themes'

vi.mock('react-native', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-native')>()
  return { ...actual, useColorScheme: vi.fn(() => 'light') }
})

import { useColorScheme } from 'react-native'

const mockUseColorScheme = useColorScheme as ReturnType<typeof vi.fn>

beforeEach(() => {
  mockUseColorScheme.mockReset()
  mockUseColorScheme.mockReturnValue('light')
})

function ThemeProbe() {
  const { base, theme } = useTheme()
  return (
    <div data-testid="probe" data-base={base} data-bg={theme.colors.background}>
      probe
    </div>
  )
}

describe('ThemeProvider', () => {
  it('resolves system to the OS color scheme', () => {
    mockUseColorScheme.mockReturnValue('dark')
    render(
      <ThemeProvider themeName="system">
        <ThemeProbe />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('probe').getAttribute('data-base')).toBe('dark')
    expect(screen.getByTestId('probe').getAttribute('data-bg')).toBe(darkTheme.colors.background)
  })

  it('resolves a named theme regardless of the OS scheme', () => {
    mockUseColorScheme.mockReturnValue('dark')
    render(
      <ThemeProvider themeName="light">
        <ThemeProbe />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('probe').getAttribute('data-base')).toBe('light')
    expect(screen.getByTestId('probe').getAttribute('data-bg')).toBe(lightTheme.colors.background)
  })
})
