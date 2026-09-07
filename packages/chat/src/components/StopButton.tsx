import { Pressable, StyleSheet, Text } from 'react-native'

export interface StopButtonProps {
  label: string
  onPress: () => void
}

export function StopButton({ label, onPress }: StopButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.button}
      testID="chat.composer.stop"
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  label: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
})
