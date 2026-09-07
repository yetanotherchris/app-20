import { Pressable, StyleSheet, Text } from 'react-native'

export interface ScrollToLatestControlProps {
  label: string
  onPress: () => void
}

export function ScrollToLatestControl({ label, onPress }: ScrollToLatestControlProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.control}
      testID="chat.scroll-to-latest"
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  control: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    elevation: 2,
  },
  label: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
})
