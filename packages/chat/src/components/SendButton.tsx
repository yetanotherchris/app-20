import { Pressable, StyleSheet, Text } from 'react-native'

export interface SendButtonProps {
  label: string
  disabled: boolean
  onPress: () => void
}

export function SendButton({ label, disabled, onPress }: SendButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabled]}
      testID="chat.composer.send"
    >
      <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  disabled: {
    backgroundColor: '#cbd5e1',
  },
  label: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  labelDisabled: {
    color: '#f1f5f9',
  },
})