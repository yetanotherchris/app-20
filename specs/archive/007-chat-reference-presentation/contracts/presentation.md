# Presentation Contract

**Date**: 2026-09-08 | **Spec**: 007-chat-reference-presentation

The default presentation of the shared chat component. Behavior, data, and customization channels are owned by specs 001-006; this contract records only the reference presentation and the tokens that drive it.

## Theme token additions

`ChatTheme` gains a `layout` group and additional tokens in the existing groups (full defaults in [data-model.md](../data-model.md)):

```ts
export interface ChatTheme {
  colors: {
    // existing tokens...
    userBubbleText: string   // user bubble text color
    sendBackground: string   // Send/Stop circular control surface
  }
  layout: {
    readingColumnWidth: number  // 540
    composerWidth: number       // 650
    sidePadding: number         // 16
  }
  spacing: {
    // existing tokens...
    paragraphGap: number        // 8
  }
  typography: {
    // existing tokens...
    messageLineHeight: number
    messageWeight: string
    composerLineHeight: number
    controlLineHeight: number
    controlWeight: string
    captionLineHeight: number
    captionWeight: string
    headingWeight: string
  }
}
```

`ThemeInput = DeepPartial<ChatTheme>` and `resolveTheme` merge the new groups exactly like the existing ones; an override that omits a new token falls back to the base theme.

## Reading column

At a 974 by 638 panel in the light theme, the reading column renders 540 px wide (within FR-002's 10% and 8 px centering tolerances) with the user bubbles ending at its right edge and assistant text starting at its left edge. Narrower panels shrink the column to the panel width minus `sidePadding` on each side. No drawer gutter is reserved.

## Role presentation

- User: right-aligned, content-sized, light-gray rounded bubble with no tail and dark readable text.
- Assistant: left-aligned text directly on the canvas, no bubble, card, border, avatar, or repeated role heading.
- System: existing stretch treatment, distinguishable from the conversation.

## Typography

Body text is the platform sans-serif at `messageTextSize`/`messageLineHeight`/`messageWeight`, with paragraph bottom margins of `paragraphGap` and turn gaps larger than line gaps. Markdown headings scale from `messageTextSize` at `headingWeight`; `strong`, `em`, links, and inline code are visually distinct. All values come from theme tokens (FR-014); the component never hardcodes a size, weight, or line height.

## Composer

A centered pill at the bottom of the chat area, `composerWidth` wide at the reference panel (wider than the reading column), white surface, thin neutral outline, subtle shadow, rounded corners (`composerRadius`), growing upward to the configured limit and then scrolling internally. The right end holds the circular up-arrow Send (accessible name "Send") or, when cancellation is available, a same-area Stop with a square glyph. No plus or microphone control and no reserved space for one.

## Message actions

Available actions render as a compact, left-aligned row beneath assistant content, one `Pressable` per action labeled with its text, reachable by keyboard and touch without hover. Availability, grouping, and host customization are unchanged; no empty row renders when no action is available.

## Responsive and theme behavior

The same hierarchy holds on narrow and wide panels, in dark and high-contrast themes, at 200% zoom, and with enlarged text: surfaces reflow without panel-wide horizontal overflow, alignment stays distinct, and readable colors and visible focus follow the theme. Host theme overrides, renderers, controls, icons, labels, actions, and states take precedence over these defaults.

## Stable identifiers

| Surface | testID |
|---|---|
| Reading column | `chat.reading-column` |
| Composer pill | `chat.composer.pill` |
| Message actions row | `chat.message-actions` |
| Per-action button | `chat.action.<id>` |

All spec 001-006 testIDs are unchanged. `chat.action-menu` no longer appears in the default presentation.

## Behavioral guarantees (unchanged from specs 001-006)

- Message ordering, identity, scrolling, Markdown, draft, keyboard, composition, and cancellation behave as before (FR-010).
- No new drawer, header, account, model, attachment, voice, share, or branding control is introduced (FR-013).
- Accessibility, touch targets, focus, reduced motion, and high contrast are never reduced to match the screenshot (FR-011).