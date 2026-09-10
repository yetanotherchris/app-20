import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { CloseReason } from '../../../shared/ipc-contract'
import type { ClosePhase } from '../hooks/useCloseGuard'

export interface CloseConfirmDialogProps {
  reason: CloseReason
  phase: ClosePhase
  error: string | null
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}

export function CloseConfirmDialog({
  reason,
  phase,
  error,
  onSave,
  onDiscard,
  onCancel,
}: CloseConfirmDialogProps) {
  const saving = phase === 'saving'

  return (
    <View style={styles.overlay} testID="shell.close-dialog">
      <View style={styles.panel}>
        <Text style={styles.title}>
          {reason === 'quit' ? 'Quit without saving?' : 'Close without saving?'}
        </Text>
        <Text style={styles.body}>This conversation has unsaved changes.</Text>
        {phase === 'error' && error ? (
          <Text style={styles.error} testID="shell.close-error">
            {error}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={onSave}
            style={[styles.button, styles.primary, saving ? styles.disabled : null]}
            testID="shell.close-save"
          >
            <Text style={styles.buttonLabel}>{saving ? 'Saving...' : 'Save'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={onDiscard}
            style={[styles.button, saving ? styles.disabled : null]}
            testID="shell.close-discard"
          >
            <Text style={styles.buttonLabel}>Discard</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={onCancel}
            style={[styles.button, saving ? styles.disabled : null]}
            testID="shell.close-cancel"
          >
            <Text style={styles.buttonLabel}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  panel: {
    width: 420,
    maxWidth: '90%',
    borderRadius: 10,
    padding: 24,
    backgroundColor: '#ffffff',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  body: {
    fontSize: 14,
    color: '#334155',
  },
  error: {
    fontSize: 13,
    color: '#b91c1c',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  button: {
    backgroundColor: '#475569',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  primary: {
    backgroundColor: '#1d4ed8',
  },
  disabled: {
    opacity: 0.6,
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
})
