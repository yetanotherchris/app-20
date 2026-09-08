# Data Model: Shared Chat Themes and Customization

**Date**: 2026-09-07 | **Spec**: 004-shared-chat-themes-customization

## Entity: Theme

A set of semantic tokens controlling appearance. The active theme is the resolved merge of a base theme (light or dark) and an optional host override.

| Token group | Tokens | Used by |
|---|---|---|
| Colors | `background`, `surface`, `border`, `text`, `textSecondary`, `primary`, `onPrimary`, `danger`, `codeBackground`, `codeHeader`, `codeText`, `userBubble`, `assistantBubble`, `systemBubble`, `unreadBadge`, `composerSurface`, `composerInput`, `composerBorder`, `sendDisabled`, `controlSurface` | Every surface in SC-001 |
| Radii | `bubbleRadius`, `composerRadius`, `controlRadius` | Bubbles, composer input, controls |
| Spacing | `bubbleMarginH`, `bubbleMarginV`, `composerPaddingH`, `composerPaddingV` | Layout metrics |
| Typography | `messageTextSize`, `composerTextSize`, `controlTextSize`, `captionTextSize` | Text surfaces |

Resolution rules (spec edge case):

- Base theme is `light` or `dark`; host selects via `Chat` `theme` prop.
- A host override is `DeepPartial<ChatTheme>`; every provided key replaces the base value, every absent key falls back to the base.
- An unknown token key is not typed and cannot be passed; a partial override therefore cannot break rendering.
- Per-surface `styleOverrides[surface]` apply after the token-derived style and win on conflict (FR-003; react-native-web 0.21.2 drops a `className` prop, research R10).

## Entity: Renderer

Maps messages or content types to their display. Three override layers:

| Layer | Key | Default | Contract |
|---|---|---|---|
| Complete message | `renderMessage(message) => ReactElement` | `MessageBubble` | FR-004; already on `MessageList`. |
| Content type | `contentRenderers[kind.format] => Component` | `PlainText` / `MarkdownText` | FR-005; unknown `kind.format` uses fallback renderer. |
| Markdown element | `markdownElementRenderers[element] => fn` | `MarkdownRenderer` base behavior | FR-006; per-element delegation, defaults elsewhere. |

Renderer failure isolation (FR-011): each message row renders inside a per-message error boundary (`MessageRendererBoundary`). A throw from a custom renderer falls back to the default renderer for that message id; other messages continue.

## Entity: Control

A replaceable interactive piece. Named slots with render-prop replacement:

| Slot | Default | Replaced via | TestID |
|---|---|---|---|
| Send | `SendButton` | `renderSend` | `chat.composer.send` |
| Stop | `StopButton` | `renderStop` | `chat.composer.stop` |
| Scroll to latest | `ScrollToLatestControl` | `renderScrollToLatest` | `chat.scroll-to-latest` |
| Composer extras | none | `renderComposerControls` | host-defined |
| Action menu | `ActionMenu` (More) | via `renderActionMenu` if needed | `chat.action-menu` |

Constraints: a custom Send control must not remove the Stop affordance during a submission (spec edge case); Stop renders independently, driven by the busy state.

## Entity: State view

The list's empty/loading/typing/error views are replaceable render props on `Chat`.

| View | Shown when | Default |
|---|---|---|
| Empty | no messages and `status === 'idle'` | `EmptyState` |
| Loading | no messages and `status === 'submitting'` | `LoadingState` |
| Typing | no messages and `status === 'streaming'` | `TypingState` |
| Error | `status === 'error'` (conversation-level; replaces the list whenever active) | `ErrorState` |

Empty/loading/typing occupy the list only while there are no messages; once messages exist the list renders normally, so a populated conversation is never hidden behind a transient loading/typing indicator. Error is the exception: it replaces the list whenever the error status is active (US3-A3). This restriction was confirmed during implementation (recorded as a decision; spec 006 owns the full status semantics).

`status` is the chat status shape referenced from spec 006 (`idle | submitting | streaming | stopping | error`). The composer consumes it for Send/Stop as already specified in spec 003.

## Entity: MessageAction

Host-registered action on a message, with grouping and availability.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Stable action identity. |
| `label` | `string` | Accessible label shown in the menu. |
| `group` | `string` | Group heading; actions render under their group label (FR-009). |
| `available` | `(message) => boolean \| boolean` | Per-message availability; absent means always available. |
| `onAction` | `(action, message) => void` | Fired with the action and the message as context. |

Rendering: the More affordance appears only when at least one action is available for the message. No actions configured means no affordance (spec edge case).

## Entity: Icon

Named icon slots rendered by controls. Defaults are text glyphs (cross-platform, no SVG).

| Slot | Default glyph | Replaced via |
|---|---|---|
| `send` | arrow | `icons.send` |
| `stop` | square | `icons.stop` |
| `scrollToLatest` | chevron-down | `icons.scrollToLatest` |
| `more` | ellipsis | `icons.more` |
| `copy` | copy glyph | `icons.copy` |

When the host supplies an icon for a slot, the default for that slot is not rendered (FR-010).

## Derived state: constraint modes

Host-imposed interaction limits (FR-014):

| Mode | Composer | Actions |
|---|---|---|
| `disabled` | Input and Send/Stop blocked | Blocked/inert |
| `readOnly` | Not editable; content readable | Blocked/inert |
| capability-limited | Per-capability: `send`, `stop`, `copy`, `actions` | A capability-disabled action is hidden or inert |

Capabilities are a partial record; absent capabilities default to enabled.