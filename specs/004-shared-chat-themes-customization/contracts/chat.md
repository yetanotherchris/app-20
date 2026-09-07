# Chat Component Contract

**Date**: 2026-09-07 | **Spec**: 004-shared-chat-themes-customization

The top-level entry point for hosts. Owns the theme context and composes `MessageList` and `Composer`. Every customization input is a documented prop; the component runs unmodified on both hosts (FR-016). Primitive components remain exported for granular use.

## Component

```tsx
<Chat
  messages={messages}
  draft={draft}
  status="idle"                        // spec 006 chat status shape
  hasEarlierMessages={hasEarlier}
  isLoadingEarlier={loadingEarlier}
  onChangeDraft={setDraft}
  onSubmit={handleSubmit}
  onStop={handleStop}
  onLoadEarlier={handleLoadEarlier}
  theme="light"                        // 'light' | 'dark' | 'system'
  themeOverride={{ colors: { primary: '#0ea5e9' } }}
  styleOverrides={{ messageBubble: { borderRadius: 4 } }}
  renderMessage={MyMessageRow}
  contentRenderers={{ 'text.markdown': MyMarkdownContent }}
  markdownElementRenderers={{ link: MyLink }}
  renderSend={MySend}
  renderStop={MyStop}
  renderScrollToLatest={MyScrollToLatest}
  renderComposerControls={MyComposerExtras}
  renderEmptyState={MyEmpty}
  renderLoadingState={MyLoading}
  renderTypingState={MyTyping}
  renderErrorState={MyError}
  messageActions={actions}
  icons={{ send: MySendIcon }}
  disabled={false}
  readOnly={false}
  capabilities={{ copy: false }}
  onLinkPress={handleLink}
  onCopyCode={copyCode}
  onMessageAction={handleAction}
/>
```

## Props

### Data and callbacks (from specs 001-003)

| Prop | Type | Required | Notes |
|---|---|---|---|
| `messages` | `readonly Message[]` | yes | Immutable, chronological. |
| `draft` | `string` | yes | Controlled composer draft. |
| `status` | `'idle' \| 'submitting' \| 'streaming' \| 'stopping' \| 'error'` | yes | Drives Send/Stop (spec 003) and state views (US3). |
| `hasEarlierMessages` | `boolean` | yes | Load-earlier control. |
| `isLoadingEarlier` | `boolean` | yes | Load-earlier in-flight state. |
| `onChangeDraft` | `(value: string) => void` | yes | Draft change. |
| `onSubmit` | `() => void` | yes | Valid send. |
| `onStop` | `() => void` | yes | Stop activated. |
| `onLoadEarlier` | `() => void` | yes | Load earlier activated. |
| `onScrollToLatest` | `() => void` | no | Scroll-to-latest activated. |
| `onLinkPress` | `(href: string) => void` | no | Delegated link activation. |
| `onCopyCode` | `(code: string, language: string \| undefined) => void \| Promise<void>` | no | Delegated code copy. |
| `onMessageAction` | `(action: MessageAction, message: Message) => void` | no | Fired when a message action is activated. |

### Theme (US1, FR-001/002/003)

| Prop | Type | Required | Notes |
|---|---|---|---|
| `theme` | `'light' \| 'dark' \| 'system'` | no | Default `'system'` (matches OS). |
| `themeOverride` | `DeepPartial<ChatTheme>` | no | Merged over the active base theme; unknown/absent tokens fall back. |
| `styleOverrides` | `Partial<Record<SurfaceName, StyleProp<...>>>` | no | Cross-platform style overrides per named surface, applied after the token-derived style (FR-003). |

### Renderers (US2, FR-004/005/006)

| Prop | Type | Required | Notes |
|---|---|---|---|
| `renderMessage` | `(message: Message) => ReactElement` | no | Default `MessageBubble`. |
| `contentRenderers` | `Partial<Record<'text.plain' \| 'text.markdown', ComponentType<...>>>` | no | Per-content-type renderers; defaults elsewhere. |
| `markdownElementRenderers` | `Partial<Record<MarkdownElement, (props) => ReactNode>>` | no | Per-element Markdown renderers; defaults elsewhere. |
| `markdownRenderer` | `RendererInterface` | no | Complete custom react-native-marked renderer. |

### Controls (US2, FR-007/013)

| Prop | Type | Required | Notes |
|---|---|---|---|
| `renderSend` | `(props: SendControlProps) => ReactElement` | no | Replaces Send. Stop stays independent during busy. |
| `renderStop` | `(props: StopControlProps) => ReactElement` | no | Replaces Stop. |
| `renderScrollToLatest` | `(props: ScrollToLatestControlProps) => ReactElement` | no | Replaces scroll-to-latest. |
| `renderComposerControls` | `() => ReactElement` | no | Extra composer controls rendered alongside Send/Stop. |

### State views (US3, FR-008)

| Prop | Type | Required | Notes |
|---|---|---|---|
| `renderEmptyState` | `() => ReactElement` | no | Default `EmptyState`. |
| `renderLoadingState` | `() => ReactElement` | no | Default `LoadingState`. |
| `renderTypingState` | `() => ReactElement` | no | Default `TypingState`. |
| `renderErrorState` | `() => ReactElement` | no | Default `ErrorState`. |

### Actions and icons (US2, FR-009/010)

| Prop | Type | Required | Notes |
|---|---|---|---|
| `messageActions` | `readonly MessageAction[]` | no | Grouped actions; no actions means no affordance. |
| `icons` | `Partial<Record<IconName, ReactNode>>` | no | Supplied icon replaces the default for that slot. |

### Constraints (US4, FR-014)

| Prop | Type | Required | Notes |
|---|---|---|---|
| `disabled` | `boolean` | no | Input and actions blocked. |
| `readOnly` | `boolean` | no | Content readable, composer not editable. |
| `capabilities` | `Partial<Record<'send' \| 'stop' \| 'copy' \| 'actions', boolean>>` | no | Disabled capability hides or inerts the related action. |

## Stable identifiers

| Surface | `testID` |
|---|---|
| Chat root | `chat.root` |
| Send | `chat.composer.send` |
| Stop | `chat.composer.stop` |
| Scroll to latest | `chat.scroll-to-latest` |
| Action menu | `chat.action-menu` |
| Empty / loading / typing / error state | `chat.state.empty` / `chat.state.loading` / `chat.state.typing` / `chat.state.error` |

Message, code, link, composer input, load-earlier, and unread badges keep their spec 001-003 testIDs.

## Behaviour guarantees

- With no customization, every surface reflects the active theme and no surface hardcodes a color (SC-001); the component is fully usable (SC-003).
- Light/dark/system themes and custom overrides all apply without modifying the component (SC-002).
- A custom renderer that throws falls back to the default for that message; other messages continue (FR-011, SC-004).
- Disabled, read-only, and capability-limited states are each reflected in the composer and actions (SC-005).
- Theme switches never lose the stream or the scroll position (US1-A3).
- Removing all message actions leaves no action affordance (edge case).
- A custom Send control keeps Stop reachable during a submission (edge case).