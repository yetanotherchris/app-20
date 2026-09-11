import { useCallback, useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { LLMChat } from 'app-20-llmchat'
import type { MenuCommand, SecretKind } from '../../shared/ipc-contract'
import { CloseConfirmDialog } from './components/CloseConfirmDialog'
import {
  Notifications,
  type NotificationItem,
  type NotificationLevel,
} from './components/Notifications'
import { ShellTopBar } from './components/ShellTopBar'
import { messageForCode } from './errorMessages'
import { useCloseGuard } from './hooks/useCloseGuard'
import { useConversationFolder } from './hooks/useConversationFolder'
import { useShellSession } from './hooks/useShellSession'
import { useSyncStatus } from './hooks/useSyncStatus'

export function App() {
  const folder = useConversationFolder()
  const sync = useSyncStatus()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const notificationIdRef = useRef(0)

  const pushNotification = useCallback((level: NotificationLevel, message: string) => {
    notificationIdRef.current += 1
    setNotifications((previous) => [...previous, { id: notificationIdRef.current, level, message }])
  }, [])

  const reportError = useCallback(
    (message: string) => pushNotification('error', message),
    [pushNotification],
  )

  const session = useShellSession(folder.key, reportError)

  const saveWithNotification = useCallback(async () => {
    const code = await session.save()
    if (code === null) pushNotification('info', 'Conversation saved.')
    else pushNotification('error', messageForCode(code))
  }, [session, pushNotification])

  // Starting a new conversation must never discard unsaved work, so save first
  // and abort if the save fails (constitution III).
  const createNewConversation = useCallback(async () => {
    if (session.dirty) {
      const code = await session.save()
      if (code !== null) {
        pushNotification('error', messageForCode(code))
        return
      }
    }
    session.newConversation()
  }, [session, pushNotification])

  const closeGuard = useCloseGuard({
    dirty: session.dirty,
    stop: session.stop,
    save: session.save,
  })

  const runImport = useCallback(
    async (kind: SecretKind) => {
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

  const runRemove = useCallback(
    async (kind: SecretKind) => {
      const result = await window.appBridge.removeSecret(kind)
      if (result.ok) {
        pushNotification(
          'info',
          kind === 'provider-key' ? 'Provider API key removed.' : 'S3 credentials removed.',
        )
      } else {
        pushNotification('error', messageForCode(result.code))
      }
    },
    [pushNotification],
  )

  const handleMenuCommand = useCallback(
    async (command: MenuCommand) => {
      switch (command) {
        case 'reveal-workspace':
          await folder.reveal()
          break
        case 'import-provider-key':
          await runImport('provider-key')
          break
        case 'import-s3-credentials':
          await runImport('s3')
          break
        case 'remove-provider-key':
          await runRemove('provider-key')
          break
        case 'remove-s3-credentials':
          await runRemove('s3')
          break
        case 'new-conversation':
          await createNewConversation()
          break
        case 'save-document':
          await saveWithNotification()
          break
      }
    },
    [folder, runImport, runRemove, createNewConversation, saveWithNotification],
  )

  const menuCommandRef = useRef(handleMenuCommand)
  menuCommandRef.current = handleMenuCommand

  useEffect(() => {
    return window.appBridge.onMenuCommand((event) => {
      void menuCommandRef.current(event.command)
    })
  }, [])

  const folderReady = folder.key !== null

  return (
    <View style={styles.app}>
      <ShellTopBar
        workspaceName={folder.info?.displayName ?? null}
        dirty={session.dirty}
        saving={session.saving}
        sync={sync}
        onNewConversation={createNewConversation}
        onSave={() => {
          void saveWithNotification()
        }}
      />
      {folder.error ? (
        <View style={styles.folderError} testID="shell.folder-error">
          <Text style={styles.folderErrorText}>{folder.error}</Text>
        </View>
      ) : null}
      <View style={styles.chat}>
        <LLMChat.Root
          messages={session.messages}
          draft={session.draft}
          status={session.status}
          hasEarlierMessages={false}
          isLoadingEarlier={false}
          disabled={!folderReady}
          onChangeDraft={session.setDraft}
          onSubmit={session.submit}
          onStop={session.stop}
          onLoadEarlier={() => undefined}
          messageActions={session.messageActions}
          onMessageAction={session.onMessageAction}
          onLinkPress={(href) => {
            void window.appBridge.openExternal(href)
          }}
          placeholder={folderReady ? 'Send a message' : 'Conversation folder is unavailable'}
        />
      </View>
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
  folderError: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fee2e2',
  },
  folderErrorText: {
    fontSize: 13,
    color: '#b91c1c',
  },
  chat: {
    flex: 1,
  },
})
