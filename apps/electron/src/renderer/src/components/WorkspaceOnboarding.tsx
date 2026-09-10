import { Pressable, StyleSheet, Text, View } from 'react-native'

export interface WorkspaceOnboardingProps {
  error: string | null
  onChoose: () => void
  onCreate: () => void
}

export function WorkspaceOnboarding({ error, onChoose, onCreate }: WorkspaceOnboardingProps) {
  return (
    <View style={styles.overlay} testID="shell.onboarding">
      <View style={styles.panel}>
        <Text style={styles.title}>Choose a workspace folder</Text>
        <Text style={styles.body}>
          Your conversations are saved as files in a folder you pick. Create a new folder or open an
          existing one to begin.
        </Text>
        {error ? (
          <Text style={styles.error} testID="shell.onboarding-error">
            {error}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={onChoose}
            style={styles.button}
            testID="shell.choose-workspace"
          >
            <Text style={styles.buttonLabel}>Open folder</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onCreate}
            style={styles.button}
            testID="shell.create-workspace"
          >
            <Text style={styles.buttonLabel}>Create folder</Text>
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
    lineHeight: 20,
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
    backgroundColor: '#1d4ed8',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
})
