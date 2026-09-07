import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'

export interface LoadEarlierControlProps {
  label: string
  isLoading: boolean
  onPress: () => void
}

export function LoadEarlierControl({ label, isLoading, onPress }: LoadEarlierControlProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isLoading }}
      disabled={isLoading}
      onPress={onPress}
      style={styles.control}
      testID="chat.load-earlier"
    >
      {isLoading ? <ActivityIndicator size="small" /> : <Text style={styles.label}>{label}</Text>}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  control: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  label: {
    color: '#2563eb',
    fontSize: 14,
  },
})
