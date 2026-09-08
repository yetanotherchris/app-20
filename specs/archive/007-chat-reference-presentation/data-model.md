# Data Model: Shared Chat Reference Presentation

**Date**: 2026-09-08 | **Spec**: 007-chat-reference-presentation

## Entity: Theme (extended)

The semantic token set from spec 004 gains a `layout` group and additional color, spacing, and typography tokens. Every new token has a default in each of the four themes (light, dark, light high-contrast, dark high-contrast) and is overridable through `themeOverride` (DeepPartial) exactly like the existing tokens.

### Colors (added)

| Token | Light | Dark | HC light | HC dark | Used by |
|---|---|---|---|---|---|
| `userBubbleText` | `#0f172a` | `#f1f5f9` | `#ffffff` | `#000000` | User bubble text (research R4) |
| `sendBackground` | `#0f172a` | `#ffffff` | `#000000` | `#ffffff` | Send/Stop control circle (research R8) |

Changed defaults: `background` light `#f8fafc` → `#ffffff` (white canvas); `userBubble` light `#2563eb` → `#ececec`, dark `#3b82f6` → `#343536`; `composerBorder` light `#cbd5e1` → `#d9d9e3`, dark `#334155` → `#3f3f46`. `assistantBubble` and `systemBubble` keep their tokens and values; the assistant role no longer consumes `assistantBubble` by default (research R5).

### Layout (new group)

| Token | Light | Dark | HC light | HC dark | Used by |
|---|---|---|---|---|---|
| `readingColumnWidth` | 540 | 540 | 540 | 540 | MessageList centered column (FR-002) |
| `composerWidth` | 650 | 650 | 650 | 650 | Composer pill (FR-002) |
| `sidePadding` | 16 | 16 | 16 | 16 | Outer padding on both surfaces |

Resolution rule: each surface sizes as `width: '100%'` capped by its `maxWidth` token, centered, so narrow panels shrink the surfaces rather than overflow (FR-002, US4-A1).

### Spacing (added)

| Token | Default | Used by |
|---|---|---|
| `paragraphGap` | 8 | Markdown paragraph bottom margin (research R3) |
| `bubbleMarginV` (changed default) | 4 → 12 | Turn gap; 24 px between consecutive messages (research R6) |
| `bubbleMarginH` (changed default) | 12 → 0 | Horizontal rhythm owned by the reading column (research R6) |

### Radii (changed defaults)

`bubbleRadius` 12 → 18 (light and dark; user bubble and system chip), `composerRadius` 18 → 24 (light and dark; composer pill). High-contrast themes keep their existing radii.

### Typography (extended)

| Token | Default | Used by |
|---|---|---|
| `messageTextSize` | 14 → 16 | Message body |
| `messageLineHeight` | 24 | Message body |
| `messageWeight` | `'400'` | Message body |
| `composerTextSize` | 16 | Composer input |
| `composerLineHeight` | 24 | Composer input |
| `controlTextSize` | 14 | Actions, Send/Stop, scroll-to-latest, load-earlier labels |
| `controlLineHeight` | 20 | Same |
| `controlWeight` | `'500'` | Same |
| `captionTextSize` | 12 | Status captions, group labels, unread count |
| `captionLineHeight` | 16 | Same |
| `captionWeight` | `'600'` | Same |
| `headingWeight` | `'600'` | Markdown headings |

The component does not set `fontFamily`; the platform sans-serif is the default because the reference face is unavailable (research R2).

## Entity: Role treatment

The per-role presentation produced by `useRoleStyles`.

| Role | Treatment | Notes |
|---|---|---|
| `user` | Right-aligned, content-sized light-gray rounded bubble, no tail, dark readable text | `alignSelf: flex-end`, `backgroundColor: userBubble`, `borderRadius: bubbleRadius`, `color: userBubbleText`, `maxWidth: '100%'` (research R4) |
| `assistant` | Left-aligned, unboxed text on the canvas | No background, border, radius, or padding; `alignSelf: flex-start`, `color: text` (research R5) |
| `system` | Stretch, subtle surface, secondary italic text | Existing spec 001 treatment retained; `alignSelf: stretch` |

All roles: `marginVertical: bubbleMarginV` (turn gap), `marginHorizontal: bubbleMarginH` (0 by default), `maxWidth: '100%'` so text wraps within the reading column.

## Entity: Layout surface

`MessageList` renders a centered reading column: outer surface (background token) → `sidePadding` wrapper → column (`width: '100%'`, `maxWidth: readingColumnWidth`, `alignSelf: 'center'`). The scroll-to-latest and unread overlay remains inside the list surface above the composer (US3-A4).

`Composer` renders a centered pill: outer container (`sidePadding`, centered, transparent, no top border) → pill (`width: '100%'`, `maxWidth: composerWidth`, `composerSurface`, `composerBorder`, `composerRadius`, subtle shadow) → transparent `TextInput` plus the right-end control area (Send or Stop, and host composer controls). The pill grows upward under the autogrow cap and then scrolls internally (FR-005).

## Entity: Control (changed defaults)

| Slot | Default | Notes |
|---|---|---|
| Send | Circular icon-only control | Up-arrow glyph, `sendBackground`, size `max(minTouchTarget, 34)`, accessible name from the send label (research R8) |
| Stop | Same-area circular control | Square glyph, same size and surface as Send; replaces Send when busy without a width change |

`renderSend`/`renderStop` replacement and the `chat.composer.send`/`chat.composer.stop` testIDs are unchanged.

## Entity: Message action presentation

| Field | Meaning (unchanged) |
|---|---|
| `id`, `label`, `group`, `available`, `onAction` | Spec 004 semantics unchanged |

Default rendering: a new `MessageActions` component renders the available actions as a compact, left-aligned row of `Pressable` buttons beneath assistant content, one per action, in group order, with per-action `testID` `chat.action.<id>`, touch-target minimums, and focus rings. `ActionMenu` remains exported for hosts that want the overflow-menu presentation. No available actions → nothing renders (research R9).

## Derived state: surface testIDs

Stable testIDs are unchanged for Chat root, Send, Stop, composer input, scroll-to-latest, load-earlier, unread badge, and message rows. New: `chat.message-actions` (row container), `chat.action.<id>` (per action button). `chat.action-menu` no longer renders in the default presentation (research R11).