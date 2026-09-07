import { StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import type { MessageRole } from '../types'

export interface RoleTreatment {
  alignSelf: 'flex-start' | 'flex-end' | 'stretch'
  bubble: StyleProp<ViewStyle>
  text: StyleProp<TextStyle>
}

const styles = StyleSheet.create({
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563eb',
    borderTopRightRadius: 4,
  },
  userText: {
    color: '#ffffff',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 4,
  },
  assistantText: {
    color: '#0f172a',
  },
  systemBubble: {
    alignSelf: 'stretch',
    backgroundColor: '#f1f5f9',
  },
  systemText: {
    color: '#475569',
    fontStyle: 'italic',
  },
  bubble: {
    marginVertical: 4,
    marginHorizontal: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 520,
  },
})

export const roleTreatments: Record<MessageRole, RoleTreatment> = {
  user: { alignSelf: 'flex-end', bubble: styles.userBubble, text: styles.userText },
  assistant: {
    alignSelf: 'flex-start',
    bubble: styles.assistantBubble,
    text: styles.assistantText,
  },
  system: { alignSelf: 'stretch', bubble: styles.systemBubble, text: styles.systemText },
}

export const bubbleBaseStyle = styles.bubble
