import { useMemo } from 'react'
import { StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { useTheme } from '../theme/ThemeContext'
import type { MessageRole } from '../types'

export interface RoleTreatment {
  alignSelf: 'flex-start' | 'flex-end' | 'stretch'
  bubble: StyleProp<ViewStyle>
  text: StyleProp<TextStyle>
}

export interface RoleStyles {
  user: RoleTreatment
  assistant: RoleTreatment
  system: RoleTreatment
  base: StyleProp<ViewStyle>
}

export function useRoleStyles(): RoleStyles {
  const { theme } = useTheme()
  return useMemo(() => {
    const styles = StyleSheet.create({
      userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: theme.colors.userBubble,
        borderTopRightRadius: 4,
      },
      userText: {
        color: theme.colors.onPrimary,
      },
      assistantBubble: {
        alignSelf: 'flex-start',
        backgroundColor: theme.colors.assistantBubble,
        borderTopLeftRadius: 4,
      },
      assistantText: {
        color: theme.colors.text,
      },
      systemBubble: {
        alignSelf: 'stretch',
        backgroundColor: theme.colors.systemBubble,
      },
      systemText: {
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
      },
      bubble: {
        marginVertical: theme.spacing.bubbleMarginV,
        marginHorizontal: theme.spacing.bubbleMarginH,
        borderRadius: theme.radii.bubbleRadius,
        paddingHorizontal: 12,
        paddingVertical: 8,
        maxWidth: 520,
      },
    })
    return {
      user: { alignSelf: 'flex-end', bubble: styles.userBubble, text: styles.userText },
      assistant: {
        alignSelf: 'flex-start',
        bubble: styles.assistantBubble,
        text: styles.assistantText,
      },
      system: { alignSelf: 'stretch', bubble: styles.systemBubble, text: styles.systemText },
      base: styles.bubble,
    }
  }, [theme])
}