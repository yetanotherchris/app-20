import { useCallback, useRef, useState } from 'react'

export interface AutogrowHeightOptions {
  minHeight: number
  maxHeight: number
}

export interface AutogrowHeightState {
  height: number
  handleContentSizeChange: (height: number) => void
  handleLayout: (event: { nativeEvent: { layout: { height: number } } }) => void
  handleTextChange: (measuredHeight?: number) => void
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Drives a multiline TextInput's height from its measured content height,
 * clamped to [minHeight, maxHeight]. Past maxHeight the input scrolls
 * internally.
 *
 * The content height is tracked in a ref so the callback identities stay
 * stable across renders. `handleTextChange(measuredHeight?)` accepts a direct
 * web scrollHeight because react-native-web's onContentSizeChange lags
 * programmatic changes and misses shrink; `handleLayout` covers iOS Fabric
 * where onContentSizeChange may fire only once on mount.
 */
export function useAutogrowHeight({
  minHeight,
  maxHeight,
}: AutogrowHeightOptions): AutogrowHeightState {
  const [height, setHeight] = useState(minHeight)
  const contentHeightRef = useRef(minHeight)

  const applyContentHeight = useCallback(
    (next: number) => {
      contentHeightRef.current = next
      setHeight(clamp(next, minHeight, maxHeight))
    },
    [minHeight, maxHeight],
  )

  const handleContentSizeChange = useCallback(
    (heightValue: number) => applyContentHeight(heightValue),
    [applyContentHeight],
  )

  const handleLayout = useCallback(
    (event: { nativeEvent: { layout: { height: number } } }) =>
      applyContentHeight(event.nativeEvent.layout.height),
    [applyContentHeight],
  )

  const handleTextChange = useCallback(
    (measuredHeight?: number) => applyContentHeight(measuredHeight ?? contentHeightRef.current),
    [applyContentHeight],
  )

  return { height, handleContentSizeChange, handleLayout, handleTextChange }
}
