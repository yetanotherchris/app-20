import { Platform } from 'react-native'

/**
 * Minimum touch-target dimension (FR-004): at least 44 points on iOS and at
 * least 24 CSS pixels on web. Applied as minHeight/minWidth so controls grow
 * with larger labels instead of clipping.
 */
export function minTouchTarget(): number {
  return Platform.OS === 'web' ? 24 : 44
}
