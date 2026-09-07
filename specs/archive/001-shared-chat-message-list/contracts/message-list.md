# Message List Component Contract

**Date**: 2026-09-07 | **Spec**: 001-shared-chat-message-list

The component is a controlled, presentational React component. The host owns messages, draft, status, and callbacks; the component renders and reports derived list state. This contract is the stable public API of the message list.

## Component

```ts
<MessageList
  messages={messages}
  hasEarlierMessages={hasEarlier}
  isLoadingEarlier={loadingEarlier}
  renderMessage={(message) => ReactElement}
  followThreshold={96}              // optional, px; FR-003 "one message height" default
  loadEarlierLabel="Load earlier messages"
  scrollToLatestLabel="Scroll to latest"
  onLoadEarlier={handleLoadEarlier}
  onScrollToLatest={handleScrollToLatest}
  onAtBottomChange={handleAtBottomChange}          // optional
  onUnreadCountChange={handleUnreadCountChange}    // optional
  onVisibleRangeChange={handleVisibleRangeChange}  // optional
/>
```

## Props

| Prop | Type | Required | Notes |
|---|---|---|---|
| `messages` | `readonly Message[]` | yes | Immutable, chronological. Stable `id` per message. |
| `hasEarlierMessages` | `boolean` | yes | Controls the Load earlier control (FR-005). |
| `isLoadingEarlier` | `boolean` | yes | Disables the Load earlier control while a load is in flight. |
| `renderMessage` | `(message: Message) => ReactElement` | yes | Host-provided row renderer; the list supplies the stable key. |
| `followThreshold` | `number` | no | Pixels from the viewport bottom within which the list auto-follows (FR-003). Default: height of one message line (96 px). |
| `loadEarlierLabel` | `string` | no | Accessible label for the Load earlier control. |
| `scrollToLatestLabel` | `string` | no | Accessible label for the scroll-to-latest control. |
| `onLoadEarlier` | `() => void` | yes | Fired when the user activates Load earlier. |
| `onScrollToLatest` | `() => void` | no | Fired when the user activates scroll-to-latest. |
| `onAtBottomChange` | `(isAtBottom: boolean) => void` | no | Fired when bottom-follow state changes. |
| `onUnreadCountChange` | `(count: number) => void` | no | Fired when the unread count changes. |
| `onVisibleRangeChange` | `(range: VisibleRange) => void` | no | Fired when the rendered message range changes. |

## Stable identifiers (FR-010)

Rendered controls expose `testID` values that map to `data-testid` on react-native-web:

| Control | `testID` |
|---|---|
| Message list | `chat.message-list` |
| Message row | `chat.message.<id>` |
| Load earlier control | `chat.load-earlier` |
| Scroll to latest control | `chat.scroll-to-latest` |
| Unread badge | `chat.unread-badge` |

## Events

| Event | Trigger |
|---|---|
| `onLoadEarlier` | User activates the Load earlier control. |
| `onScrollToLatest` | User activates the scroll-to-latest control. |
| `onAtBottomChange(false)` | `distanceFromBottom >= followThreshold` on scroll. |
| `onAtBottomChange(true)` | `distanceFromBottom < followThreshold` on scroll; unread count clears. |
| `onUnreadCountChange(n)` | Message appended while not at bottom (count increments); cleared on return to bottom. |
| `onVisibleRangeChange(range)` | Rendered window moves (debounced). |

## Behaviour guarantees

- New messages appear without scrolling when the user is at the bottom (FR-001).
- Visible messages do not move while the user reads earlier content and new messages arrive (FR-002).
- An unread count shows messages below the viewport, not streaming chunks; it clears on return to the latest (FR-006).
- Loading earlier messages preserves the visible anchor (FR-004).
- A 1,000-message conversation renders and scrolls without degradation (FR-008).
- Content outside the rendered window is not parsed or measured eagerly (FR-011).

## Type definitions (shared)

```ts
export type MessageRole = 'user' | 'assistant' | 'system'
export type MessageStatus = 'queued' | 'sending' | 'streaming' | 'complete' | 'stopped' | 'error'

export interface ContentPart {
  kind: 'text'
  format: 'plain' | 'markdown'
  text: string
}

export interface Message {
  id: string
  role: MessageRole
  contentParts: readonly ContentPart[]
  status: MessageStatus
  createdAt: string
  updatedAt?: string
}

export interface VisibleRange {
  firstIndex: number
  lastIndex: number
}
```