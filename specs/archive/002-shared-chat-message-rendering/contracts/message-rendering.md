# Message Rendering Component Contract

**Date**: 2026-09-07 | **Spec**: 002-shared-chat-message-rendering

## Components

### MessageBubble

The role-aligned message row. Hosts pass it to `MessageList` as `renderMessage`, or render it directly.

```tsx
<MessageBubble
  message={message}
  onLinkPress={(href) => handleLink(href)}
  onCopyCode={(code, language) => copyCode(code, language)}
/>
```

### Content renderers

| Component | Purpose |
|---|---|
| `MarkdownText` | Renders a markdown content part via react-native-marked with the custom renderer. |
| `PlainText` | Renders a plain content part literally; never parses. |
| `ContentRenderer` | Maps a `ContentPart` by `kind`/`format` to the right renderer; unknown kinds use the fallback. |

## Props

### MessageBubble

| Prop | Type | Required | Notes |
|---|---|---|---|
| `message` | `Message` | yes | The message to render; `role` drives alignment/treatment. |
| `onLinkPress` | `(href: string) => void` | no | Delegated link activation (FR-012). If omitted, links render as text and do nothing on press. |
| `onCopyCode` | `(code: string, language: string \| undefined) => void` | no | Delegated code copy (FR-005). If omitted, no copy control renders. |

### MarkdownRenderer options (internal contract)

| Option | Behaviour |
|---|---|
| `onLinkPress(href)` | Invoked on link activation; never navigates internally. |
| `onCopyCode(code, language)` | Invoked on copy-control activation. |
| images | `image` and `linkImage` render nothing (FR-007). |
| raw HTML | Renders as literal `<Text>` (FR-006). |

## Stable identifiers (FR-010)

| Control | `testID` |
|---|---|
| Message bubble | `chat.message.<id>` |
| Code block | `chat.code.<messageId>.<blockIndex>` |
| Code copy control | `chat.code.copy.<messageId>.<blockIndex>` |
| Copy failure state | `chat.code.copy-failed.<messageId>.<blockIndex>` |
| Link | `chat.link.<messageId>.<linkIndex>` |

## Behaviour guarantees

- Assistant markdown renders paragraphs, headings, emphasis/strong, lists, blockquotes, links, inline code, fenced code blocks, and horizontal rules (FR-001).
- Tables render formatted or as plain text, never broken layout (FR-002).
- User prompts render literally; markdown characters are not interpreted (FR-003).
- User/assistant/system roles are visually distinct with the default alignment (FR-004).
- Code blocks are selectable, horizontally scrollable, and have a copy control (FR-005).
- Raw HTML never renders as markup (FR-006).
- Remote images are never loaded (FR-007).
- Nothing executes (FR-008).
- Unsupported content renders through the fallback (FR-009).
- Text selection triggers no message actions (FR-010).
- A 6 KB markdown response renders without perceptible freezing (FR-011).
- Link activation is delegated to the host (FR-012).
- Code blocks may show syntax highlighting (FR-013, optional).
- An existing markdown library parses and renders (FR-014).