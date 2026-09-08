import { useEffect, useMemo, useRef } from 'react'
import { Platform } from 'react-native'
import type { Message } from '../types'

const ROW_TESTID_PREFIX = 'chat.message.'
const ROW_SELECTOR = '[data-testid^="chat.message."]'
const LIST_SELECTOR = '[data-testid="chat.message-list"]'
const ROOT_SELECTOR = '[data-testid="chat.root"]'
const COMPOSER_SELECTOR = '[data-testid="chat.composer.input"]'

function messageIdOf(el: Element): string | null {
  const row = el.closest(ROW_SELECTOR)
  if (!row) return null
  const id = row.getAttribute('data-testid')?.slice(ROW_TESTID_PREFIX.length)
  return id && id.length > 0 ? id : null
}

/** Find a message row by id within the owning list, never via a global query. */
function findRow(container: HTMLElement, id: string): HTMLElement | null {
  for (const row of container.querySelectorAll(ROW_SELECTOR)) {
    if (row.getAttribute('data-testid') === `${ROW_TESTID_PREFIX}${id}`) {
      return row instanceof HTMLElement ? row : null
    }
  }
  return null
}

/** Find the composer input of the chat that owns the given list container. */
function findComposer(container: HTMLElement | null): HTMLElement | null {
  if (!container) return null
  const root = container.closest(ROOT_SELECTOR)
  if (!root) return null
  const composer = root.querySelector(COMPOSER_SELECTOR)
  return composer instanceof HTMLElement ? composer : null
}

/**
 * Restore focus when the focused message is removed (spec 005 edge case).
 * A document-level focusin listener records the id of the focused message row
 * and the list container that owns it, clearing both once focus moves to a
 * real element outside the rows. When the message list changes and that id is
 * gone, focus moves to the nearest remaining row (the same index, clamped) or
 * to the composer when the list is empty. All lookups are scoped to the owning
 * list so multiple mounted Chat instances cannot interfere with each other.
 * Focus moving to <body> is ignored: it is the focus-fixup transition after an
 * element removal, not a real move. Web only; iOS has no keyboard focus to
 * preserve.
 */
export function useMessageFocusPreservation(messages: readonly Message[]): void {
  const ids = useMemo(() => messages.map((message) => message.id), [messages])
  const idsRef = useRef<readonly string[]>(ids)
  const lastFocusedIdRef = useRef<string | null>(null)
  const lastFocusedIndexRef = useRef(-1)
  const lastContainerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    idsRef.current = ids
  }, [ids])

  useEffect(() => {
    if (Platform.OS !== 'web') return
    const handleFocusIn = () => {
      const active = document.activeElement
      // Focus-fixup after a removal lands on <body>; ignore it so the
      // restoration effect still sees the recorded message.
      if (!active || active === document.body) return
      const container = active.closest(LIST_SELECTOR)
      const id = messageIdOf(active)
      if (!container || id === null) {
        lastFocusedIdRef.current = null
        lastContainerRef.current = null
        return
      }
      if (!(container instanceof HTMLElement)) return
      lastFocusedIdRef.current = id
      lastFocusedIndexRef.current = idsRef.current.indexOf(id)
      lastContainerRef.current = container
    }
    document.addEventListener('focusin', handleFocusIn)
    return () => document.removeEventListener('focusin', handleFocusIn)
  }, [])

  useEffect(() => {
    const lastId = lastFocusedIdRef.current
    if (lastId === null) return
    if (ids.includes(lastId)) {
      // Keep the recorded index current across list mutations (load-earlier
      // prepends, removals elsewhere) so a later removal restores the row that
      // is actually nearest the focused message's current position.
      lastFocusedIndexRef.current = ids.indexOf(lastId)
      return
    }
    const container = lastContainerRef.current
    if (ids.length === 0) {
      lastFocusedIdRef.current = null
      findComposer(container)?.focus()
      return
    }
    const targetIndex = Math.min(Math.max(lastFocusedIndexRef.current, 0), ids.length - 1)
    const targetId = ids[targetIndex]
    if (targetId === undefined) return
    const row = container ? findRow(container, targetId) : null
    if (row) {
      row.focus()
      lastFocusedIdRef.current = targetId
      lastFocusedIndexRef.current = targetIndex
      lastContainerRef.current = container
    } else {
      // The nearest row is not mounted (virtualized away); move focus to a
      // control so it is not dropped to <body>.
      lastFocusedIdRef.current = null
      findComposer(container)?.focus()
    }
  }, [ids])
}
