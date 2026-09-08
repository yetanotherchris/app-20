import { useMemo } from 'react'
import { StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { useTheme } from '../theme/ThemeContext'

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
      // The shared row treatment: turn spacing and a width cap so text wraps
      // inside the reading column. The horizontal rhythm belongs to the column
      // (research R6); surfaces and padding are per-role.
      base: {
        marginVertical: theme.spacing.bubbleMarginV,
        marginHorizontal: theme.spacing.bubbleMarginH,
        maxWidth: '100%',
      },
      userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: theme.colors.userBubble,
        borderRadius: theme.radii.bubbleRadius,
        paddingHorizontal: 14,
        paddingVertical: 10,
      },
      userText: {
        color: theme.colors.userBubbleText,
      },
      assistantBubble: {
        alignSelf: 'flex-start',
      },
      assistantText: {
        color: theme.colors.text,
      },
      systemBubble: {
        alignSelf: 'stretch',
        backgroundColor: theme.colors.systemBubble,
        borderRadius: theme.radii.bubbleRadius,
        paddingHorizontal: 12,
        paddingVertical: 8,
      },
      systemText: {
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
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
      base: styles.base,
    }
  }, [theme])
}
