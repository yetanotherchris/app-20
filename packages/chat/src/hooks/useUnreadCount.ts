import { useCallback, useEffect, useRef, useState } from 'react'

export interface UnreadCountState {
  unreadCount: number
  clearUnread: () => void
}

export function computeUnreadCount(
  isAtBottom: boolean,
  messageCount: number,
  current: number,
  wasAtBottom: boolean,
  prevCount: number,
): number {
  if (isAtBottom) return 0
  if (messageCount > prevCount) {
    return current + (messageCount - prevCount)
  }
  return current
}

export function useUnreadCount(isAtBottom: boolean, messageCount: number): UnreadCountState {
  const [unreadCount, setUnreadCount] = useState(0)
  const prevState = useRef({ wasAtBottom: isAtBottom, prevCount: messageCount })

  useEffect(() => {
    const { wasAtBottom, prevCount } = prevState.current
    prevState.current = { wasAtBottom: isAtBottom, prevCount: messageCount }
    setUnreadCount((current) =>
      computeUnreadCount(isAtBottom, messageCount, current, wasAtBottom, prevCount),
    )
  }, [isAtBottom, messageCount])

  const clearUnread = useCallback(() => {
    setUnreadCount(0)
  }, [])

  return { unreadCount, clearUnread }
}
