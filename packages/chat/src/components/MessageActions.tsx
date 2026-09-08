import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme/ThemeContext'
import { useFocusRing } from '../accessibility/useFocusRing'
import { minTouchTarget } from '../accessibility/minTouchTarget'
import type { MessageAction, SurfaceStyleOverrides } from '../theme/types'
import type { Message } from '../types'
import { filterAvailableActions } from './actionAvailability'

export interface MessageActionsProps {
  actions: readonly MessageAction[]
  message: Message
  onAction: (action: MessageAction, message: Message) => void
  styleOverrides?: SurfaceStyleOverrides
}

interface ActionButtonProps {
  action: MessageAction
  testID: string
  onActivate: () => void
}

function ActionButton({ action, testID, onActivate }: ActionButtonProps) {
  const { theme } = useTheme()
  const target = minTouchTarget()
  const { onFocus, onBlur, focusRingStyle } = useFocusRing()
  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          minHeight: target,
          justifyContent: 'center',
          paddingHorizontal: 8,
        },
        label: {
          color: theme.colors.textSecondary,
          fontSize: theme.typography.controlTextSize,
          lineHeight: theme.typography.controlLineHeight,
          fontWeight: theme.typography.controlWeight,
        },
      }),
    [theme, target],
  )
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.label}
      onPress={onActivate}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.button, focusRingStyle]}
      testID={testID}
    >
      <Text style={styles.label}>{action.label}</Text>
    </Pressable>
  )
}

/**
 * The default message-actions presentation: a compact, left-aligned row of
 * buttons beneath the message content. Availability rules are shared with
 * ActionMenu; with no available action nothing renders. ActionMenu stays
 * exported for hosts that prefer the overflow menu.
 */
export function MessageActions({
  actions,
  message,
  onAction,
  styleOverrides,
}: MessageActionsProps) {
  const availableActions = useMemo(
    () => filterAvailableActions(actions, message),
    [actions, message],
  )

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 4,
          marginTop: 6,
        },
      }),
    [],
  )

  if (availableActions.length === 0) return null

  return (
    <View style={[styles.row, styleOverrides?.messageActions]} testID="chat.message-actions">
      {availableActions.map((action) => (
        <ActionButton
          key={action.id}
          action={action}
          testID={`chat.action.${action.id}`}
          onActivate={() => onAction(action, message)}
        />
      ))}
    </View>
  )
}
