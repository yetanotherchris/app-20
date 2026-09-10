import { useCallback, useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { LLMChat } from 'app-20-llmchat'
import type { MenuCommand } from '../../shared/ipc-contract'
import { CloseConfirmDialog } from './components/CloseConfirmDialog'
import { Notifications, type NotificationItem } from './components/Notifications'
import { ShellTopBar } from './components/ShellTopBar'
import { WorkspaceOnboarding } from './components/WorkspaceOnboarding'
import { messageForCode } from './errorMessages'
import { useCloseGuard } from './hooks/useCloseGuard'
import { useShellSession } from './hooks/useShellSession'
import { useWorkspace } from './hooks/useWorkspace'

let notificationCounter = 0

export function App() {
  const workspace = useWorkspace()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const pushNotification = useCallback((level: 'info' | 'error', message: string) => {
    notificationCounter += 1
    setNotifications((previous) => [...previous, { id: notificationCounter, level, message }])
  }, [])

  const reportError = useCallback(
    (message: string) => pushNotification('error', message),
    [pushNotification],
  )

  const session = useShellSession(workspace.key, reportError)
  const closeGuard = useCloseGuard({
    dirty: session.dirty,
    stop: session.stop,
    save: session.save,
  })

  const saveWithNotification = useCallback(async () => {
    const saved = await session.save()
    if (saved) pushNotification('info', 'Conversation saved.')
    else pushNotification('error', messageForCode('write-failed'))
  }, [session, pushNotification])

  const runImport = useCallback(
    async (kind: 'provider-key' | 's3') => {
      const result =
        kind === 'provider-key'
          ? await window.appBridge.importProviderKey()
          : await window.appBridge.importS3Credentials()
      if (result.ok) {
        pushNotification(
          'info',
          kind === 'provider-key' ? 'Provider API key imported.' : 'S3 credentials imported.',
        )
      } else if (result.code !== 'chooser-cancelled') {
        pushNotification('error', messageForCode(result.code))
      }
    },
    [pushNotification],
  )

  const handleMenuCommand = useCallback(
    async (command: MenuCommand) => {
      switch (command) {
        case 'open-workspace':
          await workspace.choose()
          break
        case 'create-workspace':
          await workspace.create()
          break
        case 'import-provider-key':
          await runImport('provider-key')
          break
        case 'import-s3-credentials':
          await runImport('s3')
          break
        case 'new-conversation':
          session.newConversation()
          break
        case 'save-document':
          await saveWithNotification()
          break
        case 'quit':
          break
      }
    },
    [workspace, runImport, session, saveWithNotification],
  )

  const menuCommandRef = useRef(handleMenuCommand)
  menuCommandRef.current = handleMenuCommand

  useEffect(() => {
    return window.appBridge.onMenuCommand((event) => {
      void menuCommandRef.current(event.command)
    })
  }, [])

  useEffect(() => {
    return window.appBridge.onNotification((event) => pushNotification(event.level, event.message))
  }, [pushNotification])

  const showOnboarding = !workspace.key && !workspace.loading

  return (
    <View style={styles.app}>
      <ShellTopBar
        workspaceName={workspace.info?.displayName ?? null}
        dirty={session.dirty}
        saving={session.saving}
        onNewConversation={session.newConversation}
        onSave={() => {
          void saveWithNotification()
        }}
      />
      <View style={styles.chat}>
        <LLMChat.Root
          messages={session.messages}
          draft={session.draft}
          status={session.status}
          hasEarlierMessages={false}
          isLoadingEarlier={false}
          disabled={!workspace.key}
          onChangeDraft={session.setDraft}
          onSubmit={session.submit}
          onStop={session.stop}
          onLoadEarlier={() => undefined}
          onLinkPress={(href) => {
            void window.appBridge.openExternal(href)
          }}
          placeholder={workspace.key ? 'Send a message' : 'Open a workspace to start chatting'}
        />
      </View>
      {showOnboarding ? (
        <WorkspaceOnboarding
          error={workspace.error}
          onChoose={() => {
            void workspace.choose()
          }}
          onCreate={() => {
            void workspace.create()
          }}
        />
      ) : null}
      {closeGuard.request ? (
        <CloseConfirmDialog
          reason={closeGuard.request}
          phase={closeGuard.phase}
          error={closeGuard.error}
          onSave={() => {
            void closeGuard.chooseSave()
          }}
          onDiscard={closeGuard.chooseDiscard}
          onCancel={closeGuard.chooseCancel}
        />
      ) : null}
      <Notifications
        items={notifications}
        onDismiss={(id) =>
          setNotifications((previous) => previous.filter((item) => item.id !== id))
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  chat: {
    flex: 1,
  },
})
