import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme/ThemeContext'
import type { SurfaceStyleOverrides } from '../theme/types'

export interface ErrorStateProps {
  styleOverrides?: SurfaceStyleOverrides
}

export function ErrorState({ styleOverrides }: ErrorStateProps) {
  const { theme } = useTheme()
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        styleOverrides?.error,
      ]}
      testID="chat.state.error"
    >
      <Text style={[styles.text, { color: theme.colors.danger }]}>Something went wrong</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  text: {
    fontSize: 14,
  },
})
