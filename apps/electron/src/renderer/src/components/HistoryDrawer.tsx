import type { ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { ManifestEntry } from '@app-20/conversation-storage'
import { historyDate, historyModel, historyTitle } from '../history/historyEntries'

export interface HistoryDrawerProps {
  open: boolean
  entries: readonly ManifestEntry[]
  loading: boolean
  onSelect: (id: string) => void
  onNew: () => void
  onClose: () => void
}

/**
 * Toggled overlay listing recent conversations. Data and callbacks only; the
 * component holds no session state and imports no Node or Electron module so it
 * can be reused by the iOS app (spec 106).
 */
export function HistoryDrawer({
  open,
  entries,
  loading,
  onSelect,
  onNew,
  onClose,
}: HistoryDrawerProps) {
  if (!open) return null

  let body: ReactNode
  if (entries.length > 0) {
    body = (
      <ScrollView style={styles.list} testID="chat.history.list">
        {entries.map((entry) => {
          const title = historyTitle(entry)
          return (
            <Pressable
              key={entry.id}
              accessibilityRole="button"
              accessibilityLabel={title}
              onPress={() => onSelect(entry.id)}
              style={styles.entry}
              testID="chat.history.entry"
            >
              <Text numberOfLines={1} style={styles.entryTitle}>
                {title}
              </Text>
              <Text style={styles.entryMeta}>{historyModel(entry)}</Text>
              <Text style={styles.entryMeta}>{historyDate(entry.updatedAt)}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
    )
  } else if (!loading) {
    body = (
      <Text style={styles.empty} testID="chat.history.empty">
        No conversations yet.
      </Text>
    )
  }

  return (
    <View style={styles.overlay} testID="chat.history.overlay">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close conversation history"
        onPress={onClose}
        style={styles.scrim}
        testID="chat.history.scrim"
      />
      <View accessibilityViewIsModal style={styles.panel} testID="chat.history.drawer">
        <Text style={styles.heading}>Conversations</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onNew}
          style={styles.newButton}
          testID="chat.history.new"
        >
          <Text style={styles.newLabel}>New conversation</Text>
        </Pressable>
        {body}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 300,
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  heading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  newButton: {
    backgroundColor: '#0f766e',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  newLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  empty: {
    fontSize: 13,
    color: '#64748b',
    paddingVertical: 8,
  },
  list: {
    flex: 1,
  },
  entry: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 4,
    backgroundColor: '#f1f5f9',
  },
  entryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  entryMeta: {
    fontSize: 11,
    color: '#64748b',
  },
})
