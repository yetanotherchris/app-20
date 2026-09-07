import { useCallback, useEffect, useRef, useState } from 'react'

export interface UnreadCountState {
  unreadCount: number
  clearUnread: () => void
}

export function computeUnreadCount(
  isAtBottom: boolean,
  tailChanged: boolean,
  current: number,
): number {
  if (isAtBottom) return 0
  if (tailChanged) return current + 1
  return current
}

/**
 * Counts messages that arrive while the user is scrolled up. The count is keyed
 * on the tail message identity, not on `messages.length`: a prepend (load
 * earlier) changes the head, never the tail, so earlier messages are not
 * counted as unread. Streaming updates to the last message keep its id and do
 * not increment either.
 */
export function useUnreadCount(isAtBottom: boolean, tailKey: string | undefined): UnreadCountState {
  const [unreadCount, setUnreadCount] = useState(0)
  const prevTailKeyRef = useRef(tailKey)

  useEffect(() => {
    const prevTailKey = prevTailKeyRef.current
    prevTailKeyRef.current = tailKey
    const tailChanged = tailKey !== undefined && tailKey !== prevTailKey
    setUnreadCount((current) => computeUnreadCount(isAtBottom, tailChanged, current))
  }, [isAtBottom, tailKey])

  const clearUnread = useCallback(() => {
    setUnreadCount(0)
  }, [])

  return { unreadCount, clearUnread }
}
