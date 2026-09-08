import { useCallback, useRef } from 'react'
import { Platform } from 'react-native'

type RefCleanup = () => void

/**
 * A ref callback that applies a theme-styled focus outline to a DOM node
 * through native focus/blur listeners. Unlike a React focus state, this never
 * re-renders the owning component, so focusing a message row cannot disrupt
 * press interactions on its children (links, copy controls, action menus).
 * React 19 calls the returned cleanup when the ref detaches.
 */
export function useDomFocusOutlineRef(color: string): (node: unknown) => void | RefCleanup {
  const colorRef = useRef(color)
  colorRef.current = color

  return useCallback((node: unknown): void | RefCleanup => {
    if (Platform.OS !== 'web') return undefined
    const el = node as unknown as HTMLElement | null
    if (!el || typeof el.addEventListener !== 'function') return undefined

    const show = () => {
      el.style.outlineWidth = '2px'
      el.style.outlineStyle = 'solid'
      el.style.outlineColor = colorRef.current
      el.style.outlineOffset = '2px'
    }
    const hide = () => {
      el.style.outlineWidth = ''
      el.style.outlineStyle = ''
      el.style.outlineColor = ''
      el.style.outlineOffset = ''
    }
    el.addEventListener('focus', show)
    el.addEventListener('blur', hide)
    return () => {
      el.removeEventListener('focus', show)
      el.removeEventListener('blur', hide)
    }
  }, [])
}
