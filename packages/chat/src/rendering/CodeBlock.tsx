import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme/ThemeContext'
import { renderIcon } from '../icons'
import type { SurfaceStyleOverrides } from '../theme/types'

export interface CodeBlockProps {
  code: string
  language?: string
  onCopyCode?: (code: string, language: string | undefined) => void | Promise<void>
  testID?: string
  icons?: Partial<Record<'copy', React.ReactNode>>
  styleOverrides?: SurfaceStyleOverrides
}

export type CopyState = 'idle' | 'copied' | 'failed'

export function CodeBlock({
  code,
  language,
  onCopyCode,
  testID,
  icons,
  styleOverrides,
}: CodeBlockProps) {
  const { theme } = useTheme()
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    }
  }, [])

  const scheduleReset = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    resetTimerRef.current = setTimeout(() => setCopyState('idle'), 1500)
  }, [])

  const handleCopy = useCallback(() => {
    if (!onCopyCode) return
    let result: void | Promise<void> | undefined
    let threw = false
    try {
      result = onCopyCode(code, language)
    } catch {
      threw = true
    }
    if (threw) {
      setCopyState('failed')
      scheduleReset()
      return
    }
    if (result instanceof Promise) {
      void result.then(
        () => {
          setCopyState('copied')
          scheduleReset()
        },
        () => {
          setCopyState('failed')
          scheduleReset()
        },
      )
      return
    }
    setCopyState('copied')
    scheduleReset()
  }, [code, language, onCopyCode, scheduleReset])

  const copyLabel =
    copyState === 'failed' ? 'Copy failed' : copyState === 'copied' ? 'Copied' : 'Copy'

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: theme.colors.codeBackground,
          borderRadius: 8,
          marginVertical: 6,
          overflow: 'hidden',
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 10,
          paddingVertical: 6,
          backgroundColor: theme.colors.codeHeader,
        },
        language: {
          color: theme.colors.textSecondary,
          fontSize: 12,
        },
        copyButton: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 4,
          backgroundColor: theme.colors.codeHeader,
        },
        copyButtonFailed: {
          backgroundColor: theme.colors.danger,
        },
        copyLabel: {
          color: theme.colors.codeText,
          fontSize: 12,
        },
        scroll: {
          padding: 10,
        },
        code: {
          color: theme.colors.codeText,
          fontSize: 13,
          fontFamily: 'monospace',
        },
      }),
    [theme],
  )

  return (
    <View style={[styles.container, styleOverrides?.codeBlock]} testID={testID}>
      <View style={styles.header}>
        {language ? (
          <Text style={styles.language}>{language}</Text>
        ) : (
          <Text style={styles.language}>code</Text>
        )}
        {onCopyCode && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Copy code${language ? ` (${language})` : ''}`}
            onPress={handleCopy}
            style={[styles.copyButton, copyState === 'failed' && styles.copyButtonFailed]}
            testID={testID ? `${testID}.copy` : undefined}
          >
            {renderIcon('copy', icons, { size: 14, color: theme.colors.codeText })}
            <Text style={styles.copyLabel}>{copyLabel}</Text>
          </Pressable>
        )}
      </View>
      <ScrollView horizontal style={styles.scroll}>
        <Text selectable style={styles.code}>
          {code}
        </Text>
      </ScrollView>
    </View>
  )
}