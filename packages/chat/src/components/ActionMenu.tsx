import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme/ThemeContext'
import { renderIcon } from '../icons'
import { useFocusRing } from '../accessibility/useFocusRing'
import { minTouchTarget } from '../accessibility/minTouchTarget'
import type { MessageAction, SurfaceStyleOverrides } from '../theme/types'
import type { Message } from '../types'
import { filterAvailableActions } from './actionAvailability'

export interface ActionMenuProps {
  actions: readonly MessageAction[]
  message: Message
  onAction: (action: MessageAction, message: Message) => void
  moreLabel?: string
  icons?: Partial<Record<'more', React.ReactNode>>
  styleOverrides?: SurfaceStyleOverrides
}

interface ActionMenuItemProps {
  action: MessageAction
  testID: string
  onActivate: () => void
}

function ActionMenuItem({ action, testID, onActivate }: ActionMenuItemProps) {
  const { theme } = useTheme()
  const target = minTouchTarget()
  const { onFocus, onBlur, focusRingStyle } = useFocusRing()
  const styles = useMemo(
    () =>
      StyleSheet.create({
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.label}
      onPress={onActivate}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.actionItem, focusRingStyle]}
      testID={testID}
    >
      <Text style={styles.actionLabel}>{action.label}</Text>
    </Pressable>
  )
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
  const wasOpenRef = useRef(false)
  const triggerRef = useRef<HTMLElement | null>(null)
  const { onFocus, onBlur, focusRingStyle } = useFocusRing()
  const target = minTouchTarget()

  const close = useCallback(() => setOpen(false), [])

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

  // Move keyboard focus into the menu when it opens so the items are
  // reachable without tabbing through the rest of the page (FR-003), and
  // return it to the trigger when the menu closes so it is not dropped.
  useEffect(() => {
    if (Platform.OS !== 'web') return
    if (open) {
      wasOpenRef.current = true
      const frame = requestAnimationFrame(() => {
        const item = document.querySelector(`[data-testid^="chat.action."]`)
        if (item instanceof HTMLElement) item.focus()
      })
      return () => cancelAnimationFrame(frame)
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false
      triggerRef.current?.focus()
    }
    return undefined
  }, [open])

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

  const availableActions = filterAvailableActions(actions, message)

  if (availableActions.length === 0) return null

  const visibleGroups = grouped
    .map(([group, items]) => [group, items.filter((a) => availableActions.includes(a))] as const)
    .filter(([, items]) => items.length > 0)

  return (
    <View>
      <Pressable
        ref={(node) => {
          triggerRef.current = node as unknown as HTMLElement | null
        }}
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
          onRequestClose={close}
          animationType={reducedMotion ? 'none' : 'fade'}
          accessibilityViewIsModal
        >
          <Pressable style={{ flex: 1 }} onPress={close}>
            <View style={styles.menuContainer}>
              {visibleGroups.map(([group, items]) => (
                <View key={group} style={styles.group}>
                  <Text style={styles.groupLabel}>{group}</Text>
                  {items.map((action) => (
                    <ActionMenuItem
                      key={action.id}
                      action={action}
                      testID={`chat.action.${action.id}`}
                      onActivate={() => {
                        close()
                        onAction(action, message)
                      }}
                    />
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
