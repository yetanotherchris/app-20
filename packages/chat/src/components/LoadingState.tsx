import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme/ThemeContext'

export function LoadingState() {
  const { theme } = useTheme()
  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
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
