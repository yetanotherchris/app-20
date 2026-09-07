# Composer Component Contract

**Date**: 2026-09-07 | **Spec**: 003-shared-chat-composer

## Component

```tsx
<Composer
  value={draft}
  canSend={canSend}
  isBusy={isBusy}
  onChangeText={handleDraftChange}
  onSubmit={handleSend}
  onStop={handleStop}
  maxHeight={160}
  blurBehavior="keep"
  dismissKeyboardOnSend={false}
  placeholder="Message..."
  sendLabel="Send"
  stopLabel="Stop"
/>
```

## Props

| Prop | Type | Required | Notes |
|---|---|---|---|
| `value` | `string` | yes | The controlled draft (FR-008). |
| `canSend` | `boolean` | yes | Enables Send; host derives it from non-empty/whitespace draft and in-flight state (FR-004, FR-012). |
| `isBusy` | `boolean` | yes | Shows Stop; true while submission/streaming can be cancelled (FR-007). |
| `onChangeText` | `(value: string) => void` | yes | Draft change, fired once per change (no duplicates). |
| `onSubmit` | `() => void` | yes | Fired on a valid send (button, Enter on desktop, or configured blur). Never fired while busy. |
| `onStop` | `() => void` | yes | Fired when Stop is activated. |
| `maxHeight` | `number` | no | Input grows to this then scrolls internally. Default 160. |
| `minHeight` | `number` | no | Input starts here (one line). Default ~44. |
| `blurBehavior` | `'send' \| 'keep'` | no | On blur with non-empty draft: send or keep (FR-011). Default `'keep'`. |
| `dismissKeyboardOnSend` | `boolean` | no | Dismiss the on-screen keyboard after send on touch (FR-011). Default false. |
| `placeholder` | `string` | no | Input placeholder. |
| `sendLabel` | `string` | no | Accessible label for Send. Default `'Send'`. |
| `stopLabel` | `string` | no | Accessible label for Stop. Default `'Stop'`. |

## Stable identifiers (FR-010)

| Control | `testID` |
|---|---|
| Composer input | `chat.composer.input` |
| Send control | `chat.composer.send` |
| Stop control | `chat.composer.stop` |

## Behaviour guarantees

- Starts at one line (FR-001); grows to `maxHeight` then scrolls internally (FR-002, FR-003).
- Send disabled when draft empty or whitespace-only (FR-004), and while a response is in flight (FR-012).
- Desktop Enter sends, Shift+Enter inserts a newline (FR-005); touch return inserts a newline (FR-006).
- Stop shown only while submission/streaming can be cancelled (FR-007).
- Draft stays controlled; never discarded on re-render (FR-008).
- IME composition never triggers a send until text is confirmed (FR-009).
- Pasted multiline text keeps newlines (FR-010).
- Blur and keyboard-dismissal are host-configurable (FR-011).
- Exactly one `onSubmit` per send; never a second while busy (FR-012).