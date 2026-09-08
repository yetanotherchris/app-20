# Data Model: Shared Chat Accessibility

**Date**: 2026-09-08 | **Spec**: 005-shared-chat-accessibility

## Entity: System accessibility state

Detected system state that the component honors. Resolved once per `Chat` mount by `useSystemAccessibility`, with explicit prop overrides (`reducedMotion`, `highContrast` on `Chat` and `ThemeProvider`) taking precedence over detection.

| Field           | Values    | Detection (web)                                                                                                                   | Detection (native)                                                                                              |
| --------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `reducedMotion` | `boolean` | `matchMedia('(prefers-reduced-motion: reduce)')` via `AccessibilityInfo.isReduceMotionEnabled()` + `reduceMotionChanged` listener | `AccessibilityInfo.isReduceMotionEnabled()` + listener                                                          |
| `highContrast`  | `boolean` | `matchMedia('(forced-colors: active)')` or `(prefers-contrast: more)`                                                             | `AccessibilityInfo.isHighContrastEnabled()` (iOS); guarded when absent (RNW does not implement it, research R1) |

## Entity: Focus ring

The visible focus indicator on every chat control. A control shows the ring whenever it is focused (`focused` from `useFocusRing`, applied as a ring style in the control's `style` array).

| Field           | Web                  | Native                   |
| --------------- | -------------------- | ------------------------ |
| `outlineWidth`  | `2`                  | none (no keyboard focus) |
| `outlineStyle`  | `'solid'`            | none                     |
| `outlineColor`  | `theme.colors.focus` | none                     |
| `outlineOffset` | `2`                  | none                     |

Controls with rings: Send, Stop, scroll-to-latest, load-earlier, action-menu trigger and items, code-block copy, composer input (border + outline). Disabled controls never receive focus and never show the ring.

## Entity: Focus preservation

State kept by `useMessageFocusPreservation` so focus survives message removal.

| Field                  | Shape                      | Notes                                                                                                                                                                                         |
| ---------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lastFocusedMessageId` | `string \| null`           | Written by a `focusin` listener on the list container, reading the active element's `data-testid` (`chat.message.<id>`).                                                                      |
| `rowRegistry`          | `Map<string, HTMLElement>` | Message id to row DOM node, populated by row ref callbacks.                                                                                                                                   |
| Restoration rule       | -                          | On message-list change, if `lastFocusedMessageId` is absent from the new list, focus the row at the clamped previous index (else next); when the list is empty, focus the composer. Web only. |

## Entity: Status indicators (non-color)

FR-008: status is conveyed by glyph + text label, never color alone.

| Status vocabulary    | Indicator                               | Label         | Glyph       |
| -------------------- | --------------------------------------- | ------------- | ----------- |
| Message: `queued`    | `MessageStatusBadge` in `MessageBubble` | "Queued"      | hourglass   |
| Message: `sending`   | `MessageStatusBadge`                    | "Sending"     | up-arrow    |
| Message: `streaming` | `MessageStatusBadge`                    | "Streaming"   | pulse       |
| Message: `stopped`   | `MessageStatusBadge`                    | "Stopped"     | stop-square |
| Message: `error`     | `MessageStatusBadge`                    | "Error"       | alert       |
| Message: `complete`  | none                                    | -             | -           |
| Chat: `submitting`   | `ChatStatusText` above composer         | "Submitting…" | up-arrow    |
| Chat: `streaming`    | `ChatStatusText`                        | "Streaming…"  | pulse       |
| Chat: `stopping`     | `ChatStatusText`                        | "Stopping…"   | stop-square |
| Chat: `error`        | `ChatStatusText`                        | "Error"       | alert       |
| Chat: `idle`         | none                                    | -             | -           |

## Entity: Theme (contrast dimension)

Spec 004's `ChatTheme` gains a contrast dimension and one token.

| Addition       | Type     | Default light | Default dark | High-contrast light | High-contrast dark |
| -------------- | -------- | ------------- | ------------ | ------------------- | ------------------ |
| `colors.focus` | `string` | `#2563eb`     | `#60a5fa`    | `#000000`           | `#ffffff`          |

`resolveTheme(base, override, highContrast)` selects the high-contrast variant when `highContrast` is true; `ThemeProvider` resolves it from system detection or the `highContrast` prop and exposes `contrast: 'normal' \| 'high'` on the context value.

Dark-theme corrections (research R4): `onPrimary` `#ffffff` → `#0f172a`; `danger` `#ef4444` → `#f87171`. High-contrast variants:

| Token             | HC light  | HC dark   |
| ----------------- | --------- | --------- |
| `background`      | `#ffffff` | `#000000` |
| `surface`         | `#ffffff` | `#000000` |
| `border`          | `#000000` | `#ffffff` |
| `text`            | `#000000` | `#ffffff` |
| `textSecondary`   | `#000000` | `#e6e6e6` |
| `primary`         | `#000000` | `#ffffff` |
| `onPrimary`       | `#ffffff` | `#000000` |
| `danger`          | `#a00000` | `#ff7b72` |
| `codeBackground`  | `#000000` | `#000000` |
| `codeHeader`      | `#000000` | `#1a1a1a` |
| `codeText`        | `#ffffff` | `#ffffff` |
| `userBubble`      | `#000000` | `#ffffff` |
| `assistantBubble` | `#ffffff` | `#000000` |
| `systemBubble`    | `#ffffff` | `#000000` |
| `unreadBadge`     | `#000000` | `#ffffff` |
| `composerSurface` | `#ffffff` | `#000000` |
| `composerInput`   | `#ffffff` | `#000000` |
| `composerBorder`  | `#000000` | `#ffffff` |
| `sendDisabled`    | `#767676` | `#767676` |
| `controlSurface`  | `#000000` | `#ffffff` |

## Derived state: touch target

| Platform     | Minimum target                 | Source                    |
| ------------ | ------------------------------ | ------------------------- |
| Web          | 24 CSS px (minHeight/minWidth) | FR-004; WCAG 2.2 SC 2.5.8 |
| Native (iOS) | 44 pt (minHeight/minWidth)     | FR-004; HIG               |

Applied by `minTouchTarget()` on every chat control; the unread badge's fixed height becomes `minHeight` + padding so it grows with text.

## Derived state: reflow

Layout invariants for FR-005/SC-003: no surface has a fixed height that would clip large text (the composer input autogrows with an internal scroll cap; bubbles wrap; the code block's horizontal `ScrollView` is intentional scrolling). The unread badge and action-menu trigger use `minHeight`, not `height`.
