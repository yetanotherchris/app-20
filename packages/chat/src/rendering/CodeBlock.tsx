import { useCallback, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

export interface CodeBlockProps {
  code: string
  language?: string
  onCopyCode?: (code: string, language: string | undefined) => void | Promise<void>
  testID?: string
}

export type CopyState = 'idle' | 'copied' | 'failed'

export function CodeBlock({ code, language, onCopyCode, testID }: CodeBlockProps) {
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleReset = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    resetTimerRef.current = setTimeout(() => setCopyState('idle'), 1500)
  }, [])

  const handleCopy = useCallback(() => {
    if (!onCopyCode) return
    let result: void | Promise<void> | undefined
    try {
      result = onCopyCode(code, language)
    } catch {
      result = undefined
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

  const copyLabel = copyState === 'failed' ? 'Copy failed' : copyState === 'copied' ? 'Copied' : 'Copy'

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.header}>
        {language ? <Text style={styles.language}>{language}</Text> : <Text style={styles.language}>code</Text>}
        {onCopyCode && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Copy code${language ? ` (${language})` : ''}`}
            onPress={handleCopy}
            style={[styles.copyButton, copyState === 'failed' && styles.copyButtonFailed]}
            testID={testID ? `${testID}.copy` : undefined}
          >
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
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
    backgroundColor: '#1e293b',
  },
  language: {
    color: '#94a3b8',
    fontSize: 12,
  },
  copyButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#334155',
  },
  copyButtonFailed: {
    backgroundColor: '#7f1d1d',
  },
  copyLabel: {
    color: '#e2e8f0',
    fontSize: 12,
  },
  scroll: {
    padding: 10,
  },
  code: {
    color: '#e2e8f0',
    fontSize: 13,
    fontFamily: 'monospace',
  },
})