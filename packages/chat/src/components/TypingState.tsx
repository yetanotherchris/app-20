import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme/ThemeContext'

export function TypingState() {
  const { theme } = useTheme()
  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
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
