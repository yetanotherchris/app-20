import { Pressable, Text, View } from 'react-native'
import { modalStyles } from './modalStyles'

export interface WorkspaceOnboardingProps {
  error: string | null
  onChoose: () => void
  onCreate: () => void
}

export function WorkspaceOnboarding({ error, onChoose, onCreate }: WorkspaceOnboardingProps) {
  return (
    <View style={modalStyles.overlay} testID="shell.onboarding">
      <View style={modalStyles.panel}>
        <Text style={modalStyles.title}>Choose a workspace folder</Text>
        <Text style={modalStyles.body}>
          Your conversations are saved as files in a folder you pick. Create a new folder or open an
          existing one to begin.
        </Text>
        {error ? (
          <Text style={modalStyles.error} testID="shell.onboarding-error">
            {error}
          </Text>
        ) : null}
        <View style={modalStyles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={onChoose}
            style={[modalStyles.button, modalStyles.primaryButton]}
            testID="shell.choose-workspace"
          >
            <Text style={modalStyles.buttonLabel}>Open folder</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onCreate}
            style={[modalStyles.button, modalStyles.primaryButton]}
            testID="shell.create-workspace"
          >
            <Text style={modalStyles.buttonLabel}>Create folder</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}
