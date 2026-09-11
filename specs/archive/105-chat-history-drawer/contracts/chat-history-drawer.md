# Contract: Chat History Drawer (renderer)

This feature adds no IPC channel. It defines the renderer component and hook interfaces that the shell wires, and that spec 106 can reproduce on iOS. All operations go through the existing `window.appBridge` methods listed at the end.

## `HistoryDrawer` component

`apps/electron/src/renderer/src/components/HistoryDrawer.tsx`

```ts
import type { ManifestEntry } from '@app-20/conversation-storage'

export interface HistoryDrawerProps {
  open: boolean
  entries: readonly ManifestEntry[]
  loading: boolean
  onSelect: (id: string) => void
  onNew: () => void
  onClose: () => void
}

export function HistoryDrawer(props: HistoryDrawerProps): React.ReactElement | null
```

Behavior:

- Returns `null` when `open` is false. The component holds no state.
- Renders a full-surface scrim (test id `chat.history.scrim`) that calls `onClose`, and a left panel (test id `chat.history.drawer`).
- The panel is marked as a modal region (`accessibilityViewIsModal`) with a `Conversations` heading.
- The first control is New conversation (test id `chat.history.new`), which calls `onNew`.
- When `loading` is true and `entries` is empty, renders no rows.
- When `entries` is empty and not loading, renders the empty state (test id `chat.history.empty`) with the text `No conversations yet.`
- Otherwise renders one row per entry, in the given order, test id `chat.history.entry`, calling `onSelect(entry.id)`.
- A row shows `historyTitle(entry)`, `historyModel(entry)`, and `historyDate(entry.updatedAt)`.
- Pressing Escape calls `onClose` while open.

## `useConversationHistory` hook

`apps/electron/src/renderer/src/hooks/useConversationHistory.ts`

```ts
import type { ManifestEntry } from '@app-20/conversation-storage'

export interface ConversationHistory {
  entries: readonly ManifestEntry[]
  loading: boolean
  refresh: () => Promise<void>
}

export function useConversationHistory(onError: (code: AppErrorCode) => void): ConversationHistory
```

Behavior:

- `refresh` calls `window.appBridge.listConversations()`. On success it replaces `entries`; if `report.corrupt > 0` it reports `conversation-corrupt` once per refresh. On failure it reports the returned code and leaves the prior `entries`.
- `loading` is true only while a `refresh` is outstanding.
- The hook does not fetch on mount; the shell calls `refresh` when the drawer opens.

## Pure helpers

`apps/electron/src/renderer/src/history/historyEntries.ts`

```ts
import type { ManifestEntry } from '@app-20/conversation-storage'

export const HISTORY_LIMIT = 10
export const UNTITLED_TITLE = 'Untitled'
export const UNKNOWN_MODEL = 'Unknown model'

export function recentEntries(entries: readonly ManifestEntry[]): ManifestEntry[]
export function historyTitle(entry: ManifestEntry): string
export function historyModel(entry: ManifestEntry): string
export function historyDate(iso: string): string
```

## Session addition

`apps/electron/src/renderer/src/hooks/useShellSession.ts`

```ts
export interface ShellSession {
  // existing members unchanged
  conversationId: string
  /**
   * Switch the active conversation to `id`. If it is already active, resolves
   * null without a reload. Otherwise persists the current conversation first
   * and aborts on failure. Resolves null on success or the code that blocked it.
   */
  openConversation: (id: string) => Promise<AppErrorCode | null>
}
```

## Preload operations used (existing, unchanged)

| Channel              | Use                                                |
| -------------------- | -------------------------------------------------- |
| `conversations:list` | Fetch the recent-entry list when the drawer opens. |
| `conversations:read` | Load a selected conversation's messages and draft. |
| `conversations:save` | Persist the current conversation before a switch.  |

No channel is added, removed, or retyped; `src/shared/ipc-contract.ts` is unchanged.
