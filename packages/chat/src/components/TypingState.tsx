import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme/ThemeContext'
import type { SurfaceStyleOverrides } from '../theme/types'

export interface TypingStateProps {
  styleOverrides?: SurfaceStyleOverrides
}

export function TypingState({ styleOverrides }: TypingStateProps) {
  const { theme } = useTheme()
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        styleOverrides?.typing,
      ]}
      testID="chat.state.typing"
    >
      <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
        Assistant is typing...
      </Text>
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
