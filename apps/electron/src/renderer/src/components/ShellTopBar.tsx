import { Pressable, StyleSheet, Text, View } from 'react-native'

export interface ShellTopBarProps {
  workspaceName: string | null
  dirty: boolean
  saving: boolean
  onNewConversation: () => void
  onSave: () => void
}

export function ShellTopBar({
  workspaceName,
  dirty,
  saving,
  onNewConversation,
  onSave,
}: ShellTopBarProps) {
  const saveDisabled = saving || !workspaceName

  return (
    <View style={styles.bar} testID="shell.topbar">
      <Text style={styles.workspace} testID="shell.workspace-name">
        {workspaceName ? `Workspace: ${workspaceName}` : 'No workspace'}
      </Text>
      <View style={styles.actions}>
        <Text style={styles.status} testID="shell.dirty">
          {saving ? 'Saving...' : dirty ? 'Unsaved changes' : 'Saved'}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={!workspaceName}
          onPress={onNewConversation}
          style={styles.button}
          testID="shell.new-conversation"
        >
          <Text style={styles.buttonLabel}>New conversation</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={saveDisabled}
          onPress={onSave}
          style={[styles.button, saveDisabled ? styles.buttonDisabled : null]}
          testID="shell.save"
        >
          <Text style={styles.buttonLabel}>Save</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f1f5f9',
  },
  workspace: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  status: {
    fontSize: 12,
    color: '#475569',
  },
  button: {
    backgroundColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
})
