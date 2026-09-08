# Accessibility Contract

**Date**: 2026-09-08 | **Spec**: 005-shared-chat-accessibility

The default controls, states, and renderers of the shared chat component meet WCAG 2.2 AA. Per FR-009 the requirement binds the component's defaults only; host-supplied replacements (spec 004 render props) are the host's responsibility.

## Public additions to `Chat`

```tsx
<Chat
  // ... existing props (specs 001-004)
  reducedMotion?: boolean            // override system detection (FR-006)
  highContrast?: boolean             // override system detection (FR-007)
  messageListLabel?: string          // default 'Message list' (FR-002)
/>
```

`ChatStatusText` and `MessageStatusBadge` render by default; hosts replace them through the existing `renderComposerControls` / `renderMessage` surfaces if needed. No new render-prop slots are required for FR-001-009.

## Accessible names (FR-002)

Every default control's `accessibilityLabel` equals its visible label:

| Control          | Visible label                     | Accessible name                    |
| ---------------- | --------------------------------- | ---------------------------------- |
| Send             | "Send"                            | `sendLabel`                        |
| Stop             | "Stop"                            | `stopLabel`                        |
| Scroll to latest | "Scroll to latest"                | `scrollToLatestLabel`              |
| Load earlier     | "Load earlier messages"           | `loadEarlierLabel`                 |
| Action menu      | "More"                            | "More"                             |
| Code copy        | "Copy" / "Copied" / "Copy failed" | same, with language suffix         |
| Composer input   | placeholder                       | `accessibilityLabel` = placeholder |

## Keyboard operation (FR-003)

- Message rows are focusable on web; Tab order is rows → load-earlier → scroll-to-latest → composer input → send/stop.
- Every control activates with Enter/Space (react-native-web `Pressable` behavior).
- Focused message rows scroll the list with the standard scroll keys.
- Focus rings render on every focused control in both themes and high contrast.

## Touch targets (FR-004)

Web controls are at least 24 CSS px tall (and wide where icon-only); native controls at least 44 pt. The unread badge and action-menu trigger use `minHeight` so they grow with text.

## Reflow (FR-005)

No default surface clips at the largest OS text size or 200% browser zoom; text wraps or scrolls (code blocks) rather than clipping.

## Status without color (FR-008)

Message status (`queued`, `sending`, `streaming`, `stopped`, `error`) and chat status (`submitting`, `streaming`, `stopping`, `error`) are each shown as glyph + text label, so they are identifiable with color removed and without sound or animation.

## Contrast (FR-007, SC-004)

The default and high-contrast themes satisfy 4.5:1 for normal text and 3:1 for UI components on their own surfaces; asserted by the contrast unit test (`packages/chat/src/theme/contrast.test.ts`).

## Reduced motion (FR-006)

With reduced motion enabled, no unnecessary animation plays: the action menu opens without a fade and the loading spinner renders as a static glyph.

## Axe scan (SC-001)

The e2e suite runs axe-core with tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` against the built app and asserts zero violations.
