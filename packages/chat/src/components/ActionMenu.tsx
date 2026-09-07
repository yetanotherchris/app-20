import { useMemo, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme/ThemeContext'
import { renderIcon } from '../icons'
import type { MessageAction, SurfaceStyleOverrides } from '../theme/types'
import type { Message } from '../types'

export interface ActionMenuProps {
  actions: readonly MessageAction[]
  message: Message
  onAction: (action: MessageAction, message: Message) => void
  moreLabel?: string
  icons?: Partial<Record<'more', React.ReactNode>>
  styleOverrides?: SurfaceStyleOverrides
}

export function ActionMenu({
  actions,
  message,
  onAction,
  moreLabel = 'More',
  icons,
  styleOverrides,
}: ActionMenuProps) {
  const { theme } = useTheme()
  const [open, setOpen] = useState(false)

  const grouped = useMemo(() => {
    const map = new Map<string, MessageAction[]>()
    for (const action of actions) {
      const list = map.get(action.group)
      if (list) {
        list.push(action)
      } else {
        map.set(action.group, [action])
      }
    }
    return [...map.entries()]
  }, [actions])

  const styles = useMemo(
    () =>
      StyleSheet.create({
        moreButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 28,
          minHeight: 28,
          paddingHorizontal: 6,
          borderRadius: 14,
        },
        menuContainer: {
          position: 'absolute',
          right: 12,
          top: 36,
          backgroundColor: theme.colors.surface,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: theme.colors.border,
          minWidth: 180,
          overflow: 'hidden',
          elevation: 4,
        },
        group: {
          paddingVertical: 4,
        },
        groupLabel: {
          color: theme.colors.textSecondary,
          fontSize: theme.typography.captionTextSize,
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: 2,
          fontWeight: '600',
        },
        actionItem: {
          paddingHorizontal: 12,
          paddingVertical: 8,
        },
        actionLabel: {
          color: theme.colors.text,
          fontSize: theme.typography.controlTextSize,
        },
      }),
    [theme],
  )

  const availableActions = actions.filter((action) => {
    if (typeof action.available === 'function') return action.available(message)
    return action.available !== false
  })

  if (availableActions.length === 0) return null

  const visibleGroups = grouped
    .map(([group, items]) => [group, items.filter((a) => availableActions.includes(a))] as const)
    .filter(([, items]) => items.length > 0)

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={moreLabel}
        onPress={() => setOpen((v) => !v)}
        style={[styles.moreButton, styleOverrides?.actionMenu]}
        testID="chat.action-menu"
      >
        {renderIcon('more', icons, { size: 16, color: theme.colors.textSecondary })}
      </Pressable>
      {open && (
        <Modal transparent visible onRequestClose={() => setOpen(false)} animationType="fade">
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)}>
            <View style={styles.menuContainer}>
              {visibleGroups.map(([group, items]) => (
                <View key={group} style={styles.group}>
                  <Text style={styles.groupLabel}>{group}</Text>
                  {items.map((action) => (
                    <Pressable
                      key={action.id}
                      accessibilityRole="button"
                      accessibilityLabel={action.label}
                      onPress={() => {
                        setOpen(false)
                        onAction(action, message)
                      }}
                      style={styles.actionItem}
                      testID={`chat.action.${action.id}`}
                    >
                      <Text style={styles.actionLabel}>{action.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  )
}