import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import type { Message } from '../types'

const ROW_TESTID_PREFIX = 'chat.message.'

function listContainer(): HTMLElement | null {
  return document.querySelector('[data-testid="chat.message-list"]')
}

function composerInput(): HTMLElement | null {
  return document.querySelector('[data-testid="chat.composer.input"]')
}

function messageIdOf(el: Element): string | null {
  const row = el.closest(`[data-testid^="${ROW_TESTID_PREFIX}"]`)
  if (!row) return null
  const id = row.getAttribute('data-testid')?.slice(ROW_TESTID_PREFIX.length)
  return id && id.length > 0 ? id : null
}

/**
 * Restore focus when the focused message is removed (spec 005 edge case).
 * A document-level focusin listener records the id of the focused message row
 * and clears it once focus leaves the rows (composer, controls, or body). When
 * the message list changes and that id is gone, focus moves to the nearest
 * remaining row (the same index, clamped) or to the composer when the list is
 * empty. Web only; iOS has no keyboard focus to preserve.
 */
export function useMessageFocusPreservation(messages: readonly Message[]): void {
  const idsRef = useRef<readonly string[]>([])
  idsRef.current = messages.map((message) => message.id)
  const lastFocusedIdRef = useRef<string | null>(null)
  const lastFocusedIndexRef = useRef(-1)

  useEffect(() => {
    if (Platform.OS !== 'web') return
    const handleFocusIn = () => {
      const container = listContainer()
      const active = document.activeElement
      if (!active || !container || !container.contains(active)) {
        lastFocusedIdRef.current = null
        return
      }
      const id = messageIdOf(active)
      if (id === null) {
        lastFocusedIdRef.current = null
        return
      }
      lastFocusedIdRef.current = id
      lastFocusedIndexRef.current = idsRef.current.indexOf(id)
    }
    document.addEventListener('focusin', handleFocusIn)
    return () => document.removeEventListener('focusin', handleFocusIn)
  }, [])

  useEffect(() => {
    if (Platform.OS !== 'web') return
    const lastId = lastFocusedIdRef.current
    if (lastId === null) return
    if (idsRef.current.includes(lastId)) return

    const ids = idsRef.current
    if (ids.length === 0) {
      lastFocusedIdRef.current = null
      composerInput()?.focus()
      return
    }
    const targetIndex = Math.min(Math.max(lastFocusedIndexRef.current, 0), ids.length - 1)
    const targetId = ids[targetIndex]
    if (targetId === undefined) return
    const row = document.querySelector(`[data-testid="${ROW_TESTID_PREFIX}${targetId}"]`)
    if (row instanceof HTMLElement) {
      row.focus()
      lastFocusedIdRef.current = targetId
      lastFocusedIndexRef.current = targetIndex
    }
  }, [messages])
}
