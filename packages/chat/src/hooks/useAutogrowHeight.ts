import { useCallback, useState } from 'react'

export interface AutogrowHeightOptions {
  minHeight: number
  maxHeight: number
}

export interface AutogrowHeightState {
  height: number
  handleContentSizeChange: (height: number) => void
  handleLayout: (event: { nativeEvent: { layout: { height: number } } }) => void
  handleTextChange: () => void
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Drives a multiline TextInput's height from its measured content height,
 * clamped to [minHeight, maxHeight]. Past maxHeight the input scrolls
 * internally. `handleTextChange` re-measures because react-native-web's
 * onContentSizeChange does not fire when content shrinks, and `handleLayout`
 * covers iOS Fabric where onContentSizeChange may fire only once on mount.
 */
export function useAutogrowHeight({ minHeight, maxHeight }: AutogrowHeightOptions): AutogrowHeightState {
  const [height, setHeight] = useState(minHeight)
  const [contentHeight, setContentHeight] = useState(minHeight)

  const handleContentSizeChange = useCallback(
    (heightValue: number) => {
      setContentHeight(heightValue)
      setHeight(clamp(heightValue, minHeight, maxHeight))
    },
    [minHeight, maxHeight],
  )

  const handleLayout = useCallback(
    (event: { nativeEvent: { layout: { height: number } } }) => {
      setContentHeight(event.nativeEvent.layout.height)
      setHeight(clamp(event.nativeEvent.layout.height, minHeight, maxHeight))
    },
    [minHeight, maxHeight],
  )

  // Re-apply the clamp so shrink (web) and iOS-Fabric missing size-change
  // events still correct the height.
  const handleTextChange = useCallback(() => {
    setHeight(clamp(contentHeight, minHeight, maxHeight))
  }, [contentHeight, minHeight, maxHeight])

  return { height, handleContentSizeChange, handleLayout, handleTextChange }
}