import { Pressable, Text, View } from 'react-native'
import type { CloseReason } from '../../../shared/ipc-contract'
import type { ClosePhase } from '../hooks/useCloseGuard'
import { modalStyles } from './modalStyles'

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
  const disabled = saving ? modalStyles.disabledButton : null

  return (
    <View style={modalStyles.overlay} testID="shell.close-dialog">
      <View style={modalStyles.panel}>
        <Text style={modalStyles.title}>
          {reason === 'quit' ? 'Quit without saving?' : 'Close without saving?'}
        </Text>
        <Text style={modalStyles.body}>This conversation has unsaved changes.</Text>
        {phase === 'error' && error ? (
          <Text style={modalStyles.error} testID="shell.close-error">
            {error}
          </Text>
        ) : null}
        <View style={modalStyles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={onSave}
            style={[modalStyles.button, modalStyles.primaryButton, disabled]}
            testID="shell.close-save"
          >
            <Text style={modalStyles.buttonLabel}>{saving ? 'Saving...' : 'Save'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={onDiscard}
            style={[modalStyles.button, disabled]}
            testID="shell.close-discard"
          >
            <Text style={modalStyles.buttonLabel}>Discard</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={onCancel}
            style={[modalStyles.button, disabled]}
            testID="shell.close-cancel"
          >
            <Text style={modalStyles.buttonLabel}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}
