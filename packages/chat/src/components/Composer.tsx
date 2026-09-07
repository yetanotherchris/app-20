import { useCallback, useRef } from 'react'
import {
  Keyboard,
  Platform,
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputContentSizeChangeEvent,
  type TextInputKeyPressEventData,
} from 'react-native'
import { useAutogrowHeight } from '../hooks/useAutogrowHeight'
import { SendButton } from './SendButton'
import { StopButton } from './StopButton'

export interface ComposerProps {
  value: string
  canSend: boolean
  isBusy: boolean
  onChangeText: (value: string) => void
  onSubmit: () => void
  onStop: () => void
  maxHeight?: number
  minHeight?: number
  blurBehavior?: 'send' | 'keep'
  dismissKeyboardOnSend?: boolean
  placeholder?: string
  sendLabel?: string
  stopLabel?: string
}

const DEFAULT_MAX_HEIGHT = 160
const DEFAULT_MIN_HEIGHT = 44

/**
 * react-native-web fires real DOM key events with fields beyond RN's
 * `TextInputKeyPressEventData`; this is the web boundary shape.
 */
interface WebKeyPressEventData extends TextInputKeyPressEventData {
  shiftKey?: boolean
  isComposing?: boolean
  preventDefault?: () => void
}

function isTouchTarget(): boolean {
  if (Platform.OS !== 'web') return true
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(pointer: coarse)').matches
}

export function Composer({
  value,
  canSend,
  isBusy,
  onChangeText,
  onSubmit,
  onStop,
  maxHeight = DEFAULT_MAX_HEIGHT,
  minHeight = DEFAULT_MIN_HEIGHT,
  blurBehavior = 'keep',
  dismissKeyboardOnSend = false,
  placeholder = 'Message...',
  sendLabel = 'Send',
  stopLabel = 'Stop',
}: ComposerProps) {
  const touchTarget = useRef(isTouchTarget()).current
  const busyRef = useRef(isBusy)
  busyRef.current = isBusy

  const { height, handleContentSizeChange, handleLayout, handleTextChange } = useAutogrowHeight({
    minHeight,
    maxHeight,
  })

  const performSubmit = useCallback(() => {
    if (!canSend) return
    onSubmit()
    if (dismissKeyboardOnSend && touchTarget) {
      Keyboard.dismiss()
    }
  }, [canSend, onSubmit, dismissKeyboardOnSend, touchTarget])

  const handleChangeText = useCallback(
    (next: string) => {
      handleTextChange()
      onChangeText(next)
    },
    [handleTextChange, onChangeText],
  )

  const handleSubmitEditing = useCallback(() => {
    // Native path: onSubmitEditing fires only on an actual submit, after IME
    // composition ends, so it is IME-safe. A multiline input with
    // submitBehavior="newline" only fires this on the explicit submit trigger.
    performSubmit()
  }, [performSubmit])

  const handleKeyPress = useCallback(
    (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (Platform.OS !== 'web') return
      const nativeEvent = event.nativeEvent as WebKeyPressEventData
      if (nativeEvent.key !== 'Enter') return
      // IME composition must not submit (FR-009).
      if (nativeEvent.isComposing) return
      // Desktop Enter submits; Shift+Enter and touch-return insert a newline.
      if (!nativeEvent.shiftKey && !touchTarget) {
        nativeEvent.preventDefault?.()
        performSubmit()
      }
    },
    [performSubmit, touchTarget],
  )

  const handleBlur = useCallback(() => {
    if (blurBehavior === 'send' && value.trim().length > 0 && !busyRef.current) {
      performSubmit()
    }
  }, [blurBehavior, value, performSubmit])

  return (
    <View style={styles.container}>
      <TextInput
        value={value}
        onChangeText={handleChangeText}
        onContentSizeChange={(event: TextInputContentSizeChangeEvent) =>
          handleContentSizeChange(event.nativeEvent.contentSize.height)
        }
        onLayout={handleLayout}
        onKeyPress={handleKeyPress}
        onBlur={handleBlur}
        onSubmitEditing={handleSubmitEditing}
        multiline
        blurOnSubmit={false}
        placeholder={placeholder}
        style={[styles.input, { height }]}
        testID="chat.composer.input"
      />
      {isBusy ? (
        <StopButton label={stopLabel} onPress={onStop} />
      ) : (
        <SendButton label={sendLabel} disabled={!canSend} onPress={performSubmit} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
    color: '#0f172a',
    textAlignVertical: 'top',
  },
})