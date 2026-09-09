# Data Model: LLMChat Rename and Repository Move

**Date**: 2026-09-09

## Entities

This feature is a rename and relocation; no new entities are introduced. The entities below describe the existing package structure with updated identifiers.

### Package

| Field | Before | After |
|-------|--------|-------|
| name | `@app-20/chat` | `app-20-llmchat` |
| version | `0.3.0` | `1.0.0` |
| private | `true` | `false` |
| description | "Shared chat UI component for the app-20 desktop and iOS applications" | "React component library for LLM chat interfaces" |
| repository | (none) | `https://github.com/yetanotherchris/app-20-llmchat` |
| homepage | (none) | `https://yetanotherchris.github.io/app-20-llmchat` |
| bugs | (none) | `https://github.com/yetanotherchris/app-20-llmchat/issues` |

### Component Export Mapping

| Old Export | New Export (dot notation) | Source File (old) | Source File (new) |
|------------|--------------------------|--------------------|--------------------|
| `Chat` | `LLMChat.Root` | `Chat.tsx` | `LLMChat.Root.tsx` |
| `MessageList` | `LLMChat.Conversation` | `MessageList.tsx` | `LLMChat.Conversation.tsx` |
| `Composer` | `LLMChat.PromptInput` | `Composer.tsx` | `LLMChat.PromptInput.tsx` |
| `MessageBubble` | `LLMChat.Bubble` | `MessageBubble.tsx` | `LLMChat.Bubble.tsx` |
| `MessageStatusBadge` | `LLMChat.Status` | `MessageStatusBadge.tsx` | `LLMChat.Status.tsx` |
| `SendButton` | `LLMChat.SendButton` | `SendButton.tsx` | `LLMChat.SendButton.tsx` |
| `StopButton` | `LLMChat.StopButton` | `StopButton.tsx` | `LLMChat.StopButton.tsx` |
| `ScrollToLatestControl` | `LLMChat.ScrollToLatest` | `ScrollToLatestControl.tsx` | `LLMChat.ScrollToLatest.tsx` |
| `LoadEarlierControl` | `LLMChat.LoadEarlier` | `LoadEarlierControl.tsx` | `LLMChat.LoadEarlier.tsx` |
| `UnreadBadge` | `LLMChat.UnreadBadge` | `UnreadBadge.tsx` | `LLMChat.UnreadBadge.tsx` |
| `EmptyState` | `LLMChat.EmptyState` | `EmptyState.tsx` | `LLMChat.EmptyState.tsx` |
| `LoadingState` | `LLMChat.LoadingState` | `LoadingState.tsx` | `LLMChat.LoadingState.tsx` |
| `TypingState` | `LLMChat.TypingState` | `TypingState.tsx` | `LLMChat.TypingState.tsx` |
| `ErrorState` | `LLMChat.ErrorState` | `ErrorState.tsx` | `LLMChat.ErrorState.tsx` |

### Internal Components (not renamed)

These components are not part of the public API and retain their names:

- `ActionMenu`
- `MessageActions`
- `MessageRendererBoundary`
- `ChatStatusText`
- `StatusIndicator`

### Unchanged Exports

These exports retain their names (hooks, theme, accessibility, types):

- Hooks: `useAutogrowHeight`, `useAtBottom`, `useUnreadCount`, `useChatSession`, `useFocusRing`, `useMessageFocusPreservation`, `useDomFocusOutlineRef`, `useSystemAccessibility`
- Theme: `ThemeProvider`, `useTheme`, `resolveTheme`, `themeBaseForName`, `lightTheme`, `darkTheme`, `baseThemes`, `highContrastThemes`, `relativeLuminance`, `contrastRatio`
- Rendering: `ContentRenderer`, `MarkdownText`, `PlainText`, `CodeBlock`, `MarkdownRenderer`
- Accessibility: `minTouchTarget`, `MESSAGE_STATUS_PRESENTATION`, `CHAT_STATUS_PRESENTATION`
- Icons: `defaultIcons`, `renderIcon`
- Types: All existing type exports (updated to reference new component names where applicable)

### State Transitions

No state transitions change. The component's internal state management (conversation state, theme state, message list state) is unaffected by the rename.

## Validation Rules

- `package.json` name must be `app-20-llmchat` (no scope)
- `package.json` version must be `1.0.0`
- `package.json` private must be `false`
- All 14 renamed component exports must be present on `LLMChat` namespace
- No `any` types in exported type definitions
- `npm pack` must produce tarball under 100KB (excluding source maps)
- All existing tests must pass without modification to test logic
