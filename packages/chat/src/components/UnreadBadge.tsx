import { StyleSheet, Text, View } from 'react-native'

export interface UnreadBadgeProps {
  count: number
}

export function UnreadBadge({ count }: UnreadBadgeProps) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.badge} testID="chat.unread-badge">
      <Text style={styles.count}>{count}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
  },
  count: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
})
