import { Text, type StyleProp, type TextStyle } from 'react-native'
import type { ContentPart } from '../types'

export interface PlainTextProps {
  part: ContentPart
  style?: StyleProp<TextStyle>
}

export function PlainText({ part, style }: PlainTextProps) {
  return (
    <Text selectable style={style}>
      {part.text}
    </Text>
  )
}
