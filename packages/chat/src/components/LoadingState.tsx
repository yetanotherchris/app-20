import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme/ThemeContext'
import type { SurfaceStyleOverrides } from '../theme/types'

export interface LoadingStateProps {
  styleOverrides?: SurfaceStyleOverrides
}

export function LoadingState({ styleOverrides }: LoadingStateProps) {
  const { theme } = useTheme()
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        styleOverrides?.loading,
      ]}
      testID="chat.state.loading"
    >
      <ActivityIndicator color={theme.colors.primary} />
      <Text style={[styles.text, { color: theme.colors.textSecondary }]}>Loading...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  text: {
    fontSize: 14,
  },
})
