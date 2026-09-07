import { useCallback, useEffect, useMemo, useRef } from 'react'
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
import { useTheme } from '../theme/ThemeContext'
import { SendButton, type SendButtonProps } from './SendButton'
import { StopButton, type StopButtonProps } from './StopButton'
import type { Capabilities, SurfaceStyleOverrides } from '../theme/types'

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
  renderSend?: (props: SendButtonProps) => React.ReactElement
  renderStop?: (props: StopButtonProps) => React.ReactElement
  renderComposerControls?: () => React.ReactNode
  disabled?: boolean
  readOnly?: boolean
  capabilities?: Capabilities
  icons?: Partial<Record<'send' | 'stop', React.ReactNode>>
  styleOverrides?: SurfaceStyleOverrides
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
  keyCode?: number
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
  renderSend,
  renderStop,
  renderComposerControls,
  disabled = false,
  readOnly = false,
  capabilities,
  icons,
  styleOverrides,
}: ComposerProps) {
  const { theme } = useTheme()
  const isTouch = useRef(isTouchTarget()).current
  const isBusyRef = useRef(isBusy)
  isBusyRef.current = isBusy
  const inputRef = useRef<TextInput | null>(null)
  const lastSubmittedRef = useRef<string | null>(null)

  const sendEnabled = canSend && !disabled && !readOnly && capabilities?.send !== false
  const stopEnabled = isBusy && capabilities?.stop !== false
  const editable = !disabled && !readOnly

  const { height, handleContentSizeChange, handleLayout, handleTextChange } = useAutogrowHeight({
    minHeight,
    maxHeight,
  })

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 8,
          paddingHorizontal: theme.spacing.composerPaddingH,
          paddingVertical: theme.spacing.composerPaddingV,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.composerSurface,
        },
        inputWrap: {
          flex: 1,
        },
        input: {
          minHeight,
          borderRadius: theme.radii.composerRadius,
          borderWidth: 1,
          borderColor: theme.colors.composerBorder,
          backgroundColor: theme.colors.composerInput,
          paddingHorizontal: 14,
          paddingVertical: 10,
          fontSize: theme.typography.composerTextSize,
          lineHeight: 20,
          color: theme.colors.text,
          textAlignVertical: 'top',
        },
        controls: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
      }),
    [theme, minHeight],
  )

  const performSubmit = useCallback(() => {
    if (!sendEnabled || isBusyRef.current) return
    if (lastSubmittedRef.current === value) return
    lastSubmittedRef.current = value
    onSubmit()
    if (dismissKeyboardOnSend && isTouch) {
      Keyboard.dismiss()
    }
  }, [sendEnabled, value, onSubmit, dismissKeyboardOnSend, isTouch])

  const measureAndApply = useCallback(() => {
    if (Platform.OS !== 'web') return
    const host = inputRef.current as unknown as { scrollHeight?: number } | null
    if (host?.scrollHeight) handleTextChange(host.scrollHeight)
  }, [handleTextChange])

  useEffect(() => {
    measureAndApply()
  }, [value, measureAndApply])

  const handleChangeText = useCallback(
    (next: string) => {
      // A new draft means a later identical submit is a fresh send, not a
      // duplicate of the previous one.
      if (lastSubmittedRef.current !== null && next !== lastSubmittedRef.current) {
        lastSubmittedRef.current = null
      }
      measureAndApply()
      onChangeText(next)
    },
    [measureAndApply, onChangeText],
  )

  const handleSubmitEditing = useCallback(() => {
    performSubmit()
  }, [performSubmit])

  const handleKeyPress = useCallback(
    (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (Platform.OS !== 'web') return
      const nativeEvent = event.nativeEvent as WebKeyPressEventData
      if (nativeEvent.key !== 'Enter') return
      if (nativeEvent.isComposing || nativeEvent.keyCode === 229) return
      if (!nativeEvent.shiftKey && !isTouch) {
        nativeEvent.preventDefault?.()
        performSubmit()
      }
    },
    [performSubmit, isTouch],
  )

  const handleBlur = useCallback(() => {
    if (blurBehavior === 'send' && value.trim().length > 0 && !isBusyRef.current && sendEnabled) {
      performSubmit()
    }
  }, [blurBehavior, value, performSubmit, sendEnabled])

  const handleSendPress = useCallback(() => {
    performSubmit()
  }, [performSubmit])

  const sendControl = renderSend ? (
    renderSend({
      label: sendLabel,
      disabled: !sendEnabled,
      onPress: handleSendPress,
      icons,
      styleOverrides,
    })
  ) : (
    <SendButton
      label={sendLabel}
      disabled={!sendEnabled}
      onPress={handleSendPress}
      icons={icons}
      styleOverrides={styleOverrides}
    />
  )

  const stopControl = renderStop ? (
    renderStop({ label: stopLabel, onPress: onStop, icons, styleOverrides })
  ) : (
    <StopButton label={stopLabel} onPress={onStop} icons={icons} styleOverrides={styleOverrides} />
  )

  return (
    <View style={[styles.container, styleOverrides?.composer]} testID="chat.composer">
      {renderComposerControls?.()}
      <View style={styles.inputWrap}>
        <TextInput
          ref={inputRef}
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
          placeholderTextColor={theme.colors.textSecondary}
          editable={editable}
          style={[styles.input, { height }, styleOverrides?.composerInput]}
          testID="chat.composer.input"
        />
      </View>
      <View style={styles.controls}>{stopEnabled ? stopControl : sendControl}</View>
    </View>
  )
}
