import { useCallback, useRef, useState } from 'react'

export interface ScrollMetrics {
  contentHeight: number
  offsetY: number
  viewportHeight: number
}

export function distanceFromBottom(metrics: ScrollMetrics): number {
  return metrics.contentHeight - (metrics.offsetY + metrics.viewportHeight)
}

export function isNearBottom(metrics: ScrollMetrics, threshold: number): boolean {
  return distanceFromBottom(metrics) <= threshold
}

export interface AtBottomState {
  isAtBottom: boolean
  update: (metrics: ScrollMetrics) => void
}

export function useAtBottom(
  threshold: number,
  onAtBottomChange?: (isAtBottom: boolean) => void,
): AtBottomState {
  const [isAtBottom, setIsAtBottom] = useState(true)
  const isAtBottomRef = useRef(true)
  const onAtBottomChangeRef = useRef(onAtBottomChange)
  onAtBottomChangeRef.current = onAtBottomChange

  const update = useCallback(
    (metrics: ScrollMetrics) => {
      const next = isNearBottom(metrics, threshold)
      if (next !== isAtBottomRef.current) {
        isAtBottomRef.current = next
        setIsAtBottom(next)
        onAtBottomChangeRef.current?.(next)
      }
    },
    [threshold],
  )

  return { isAtBottom, update }
}
