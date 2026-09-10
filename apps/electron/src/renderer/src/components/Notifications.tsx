import { Pressable, StyleSheet, Text, View } from 'react-native'

export type NotificationLevel = 'info' | 'error'

export interface NotificationItem {
  id: number
  level: NotificationLevel
  message: string
}

export interface NotificationsProps {
  items: readonly NotificationItem[]
  onDismiss: (id: number) => void
}

export function Notifications({ items, onDismiss }: NotificationsProps) {
  if (items.length === 0) return null

  return (
    <View style={styles.stack} testID="shell.notifications">
      {items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          onPress={() => onDismiss(item.id)}
          style={[styles.toast, item.level === 'error' ? styles.error : styles.info]}
          testID={`shell.notification.${item.level}`}
        >
          <Text style={styles.text}>{item.message}</Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    gap: 8,
    maxWidth: 360,
  },
  toast: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  info: {
    backgroundColor: '#0f766e',
  },
  error: {
    backgroundColor: '#b91c1c',
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
  },
})
