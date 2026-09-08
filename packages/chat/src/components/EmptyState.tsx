import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme/ThemeContext'
import type { SurfaceStyleOverrides } from '../theme/types'

export interface EmptyStateProps {
  styleOverrides?: SurfaceStyleOverrides
}

export function EmptyState({ styleOverrides }: EmptyStateProps) {
  const { theme } = useTheme()
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        styleOverrides?.empty,
      ]}
      testID="chat.state.empty"
    >
      <Text style={[styles.text, { color: theme.colors.textSecondary }]}>No messages yet</Text>
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
