import { startTransition, useCallback, useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { LLMChat } from 'app-20-llmchat'
import type { AppErrorCode } from '../../shared/error-codes'
import type { MenuCommand, SecretKind } from '../../shared/ipc-contract'
import { HistoryDrawer } from './components/HistoryDrawer'
import {
  Notifications,
  type NotificationItem,
  type NotificationLevel,
} from './components/Notifications'
import { ShellTopBar } from './components/ShellTopBar'
import { messageForCode } from './errorMessages'
import { useConversationFolder } from './hooks/useConversationFolder'
import { useConversationHistory } from './hooks/useConversationHistory'
import { useShellSession } from './hooks/useShellSession'
import { useSyncStatus } from './hooks/useSyncStatus'

export function App() {
  const folder = useConversationFolder()
  const sync = useSyncStatus()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [chatRootKey, setChatRootKey] = useState(0)
  const [isProviderKeyGatePending, setProviderKeyGatePending] = useState(false)
  const notificationIdRef = useRef(0)
  const providerKeyGatePendingRef = useRef(false)

  const pushNotification = useCallback((level: NotificationLevel, message: string) => {
    notificationIdRef.current += 1
    setNotifications((previous) => [...previous, { id: notificationIdRef.current, level, message }])
  }, [])

  const reportError = useCallback(
    (message: string) => pushNotification('error', message),
    [pushNotification],
  )

  const reportCode = useCallback(
    (code: AppErrorCode) => pushNotification('error', messageForCode(code)),
    [pushNotification],
  )

  const session = useShellSession(folder.key, reportError)
  const {
    entries: historyEntries,
    loading: historyLoading,
    refresh: refreshHistory,
  } = useConversationHistory(reportCode)

  const createNewConversation = useCallback(async (): Promise<boolean> => {
    const code = await session.newConversation()
    if (code !== null) {
      pushNotification('error', messageForCode(code))
      return false
    }
    return true
  }, [session, pushNotification])

  const openHistory = useCallback(() => {
    setDrawerOpen(true)
    void refreshHistory()
  }, [refreshHistory])

  const closeHistory = useCallback(() => setDrawerOpen(false), [])

  const selectConversation = useCallback(
    async (id: string) => {
      const code = await session.openConversation(id)
      if (code !== null) {
        reportCode(code)
        void refreshHistory()
        return
      }
      setDrawerOpen(false)
    },
    [session, reportCode, refreshHistory],
  )

  const startNewFromDrawer = useCallback(async () => {
    const started = await createNewConversation()
    if (!started) return
    setDrawerOpen(false)
    void refreshHistory()
  }, [createNewConversation, refreshHistory])

  useEffect(() => {
    if (!drawerOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [drawerOpen])

  const runImport = useCallback(
    async (kind: SecretKind): Promise<boolean> => {
      const result =
        kind === 'provider-key'
          ? await window.appBridge.importProviderKey()
          : await window.appBridge.importS3Credentials()
      if (result.ok) {
        pushNotification(
          'info',
          kind === 'provider-key' ? 'Provider API key imported.' : 'S3 credentials imported.',
        )
        return true
      } else if (result.code !== 'chooser-cancelled') {
        pushNotification('error', messageForCode(result.code))
      }
      return false
    },
    [pushNotification],
  )

  const submitPrompt = useCallback(async () => {
    if (providerKeyGatePendingRef.current) return
    providerKeyGatePendingRef.current = true
    setProviderKeyGatePending(true)
    try {
      const status = await window.appBridge.getSecretsStatus()
      if (!status.ok) {
        reportCode(status.code)
        return
      }
      if (!status.value.providerKey) {
        if (!(await runImport('provider-key'))) {
          // The shared chat root consumes submit events, so remount it after a
          // rejected gate while retaining the session-owned draft.
          startTransition(() => setChatRootKey((previous) => previous + 1))
          return
        }
      }
      session.submit()
    } catch {
      reportError(messageForCode('unknown'))
    } finally {
      providerKeyGatePendingRef.current = false
      setProviderKeyGatePending(false)
    }
  }, [session, runImport, reportCode, reportError])

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
      }
    },
    [folder, runImport, runRemove, createNewConversation],
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
        sync={sync}
        onOpenHistory={openHistory}
        onNewConversation={createNewConversation}
      />
      {folder.error ? (
        <View style={styles.folderError} testID="shell.folder-error">
          <Text style={styles.folderErrorText}>{folder.error}</Text>
        </View>
      ) : null}
      <View style={styles.chat}>
        <LLMChat.Root
          key={chatRootKey}
          messages={session.messages}
          draft={session.draft}
          status={session.status}
          hasEarlierMessages={false}
          isLoadingEarlier={false}
          disabled={!folderReady || isProviderKeyGatePending}
          onChangeDraft={session.setDraft}
          onSubmit={submitPrompt}
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
      <HistoryDrawer
        open={drawerOpen}
        entries={historyEntries}
        loading={historyLoading}
        onSelect={(id) => {
          void selectConversation(id)
        }}
        onNew={() => {
          void startNewFromDrawer()
        }}
        onClose={closeHistory}
      />
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
