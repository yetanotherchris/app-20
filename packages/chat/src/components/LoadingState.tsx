import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { renderIcon } from '../icons'
import { useTheme } from '../theme/ThemeContext'
import type { SurfaceStyleOverrides } from '../theme/types'

export interface LoadingStateProps {
  styleOverrides?: SurfaceStyleOverrides
}

/**
 * Loading view. The ActivityIndicator spinner animates continuously; under
 * reduced motion it is replaced by a static glyph so no unnecessary animation
 * plays (FR-006, research R9).
 */
export function LoadingState({ styleOverrides }: LoadingStateProps) {
  const { theme, reducedMotion } = useTheme()
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        styleOverrides?.loading,
      ]}
      testID="chat.state.loading"
    >
      {reducedMotion ? (
        renderIcon('sending', undefined, { size: 18, color: theme.colors.primary })
      ) : (
        <ActivityIndicator color={theme.colors.primary} />
      )}
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
