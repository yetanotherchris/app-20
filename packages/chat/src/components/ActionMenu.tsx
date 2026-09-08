import { useEffect, useMemo, useState } from 'react'
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme/ThemeContext'
import { renderIcon } from '../icons'
import { useFocusRing } from '../accessibility/useFocusRing'
import { minTouchTarget } from '../accessibility/minTouchTarget'
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
  const { theme, reducedMotion } = useTheme()
  const [open, setOpen] = useState(false)
  const { onFocus, onBlur, focusRingStyle } = useFocusRing()
  const target = minTouchTarget()

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
          minWidth: target,
          minHeight: target,
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
          minHeight: target,
          justifyContent: 'center',
          paddingHorizontal: 12,
          paddingVertical: 8,
        },
        actionLabel: {
          color: theme.colors.text,
          fontSize: theme.typography.controlTextSize,
        },
      }),
    [theme, target],
  )

  // Move keyboard focus into the menu when it opens so the items are
  // reachable without tabbing through the rest of the page (FR-003).
  useEffect(() => {
    if (Platform.OS !== 'web') return
    if (!open) return
    const frame = requestAnimationFrame(() => {
      const item = document.querySelector(`[data-testid^="chat.action."]`)
      if (item instanceof HTMLElement) item.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [open])

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
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        onFocus={onFocus}
        onBlur={onBlur}
        style={[styles.moreButton, focusRingStyle, styleOverrides?.actionMenu]}
        testID="chat.action-menu"
      >
        {renderIcon('more', icons, { size: 16, color: theme.colors.textSecondary })}
      </Pressable>
      {open && (
        <Modal
          transparent
          visible
          onRequestClose={() => setOpen(false)}
          animationType={reducedMotion ? 'none' : 'fade'}
          accessibilityViewIsModal
        >
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
