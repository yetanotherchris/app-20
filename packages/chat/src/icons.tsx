import type { ReactNode } from 'react'
import { Text, type StyleProp, type TextStyle } from 'react-native'
import type { IconName } from './theme/types'

/**
 * Default icons are text glyphs so they render on both web and native
 * without react-native-svg (which is web-stubbed and renders nothing).
 * Hosts replace any slot through the `icons` map on Chat (FR-010).
 */

export interface IconProps {
  size?: number
  color?: string
  style?: StyleProp<TextStyle>
}

function makeGlyph(glyph: string) {
  return function GlyphIcon({ size = 16, color, style }: IconProps) {
    return (
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[{ fontSize: size, color }, style]}
      >
        {glyph}
      </Text>
    )
  }
}

export const defaultIcons: Record<IconName, (props: IconProps) => ReactNode> = {
  send: makeGlyph('→'),
  stop: makeGlyph('■'),
  scrollToLatest: makeGlyph('⌄'),
  more: makeGlyph('⋯'),
  copy: makeGlyph('⎘'),
}

export function renderIcon(
  iconName: IconName,
  hostIcons: Partial<Record<IconName, ReactNode>> | undefined,
  fallbackProps: IconProps,
): ReactNode | null {
  const supplied = hostIcons?.[iconName]
  if (supplied != null) return supplied
  return defaultIcons[iconName](fallbackProps)
}
