import { Text } from 'react-native'
import type { ContentPart } from '../types'

export interface PlainTextProps {
  part: ContentPart
  style?: object
}

export function PlainText({ part, style }: PlainTextProps) {
  return (
    <Text selectable style={style}>
      {'text' in part ? part.text : ''}
    </Text>
  )
}
