# Data Model: Shared Chat Composer

**Date**: 2026-09-07 | **Spec**: 003-shared-chat-composer

## Entity: Draft

The in-progress composer text, owned by the host (FR-008). The component reads `value` and reports changes; it never stores or discards the draft itself.

| Field | Owner | Notes |
|---|---|---|
| `value` | host | The current draft text. |
| `canSend` | host | Derived: `value.trim().length > 0` and no response in flight (FR-004, FR-012). |
| `isBusy` | host | True while a submission/streaming can be cancelled (FR-007). Drives the Stop control. |

## Derived composer state (component-internal)

| State | Derivation |
|---|---|
| `height` | `clamp(onContentSizeChange.height, minHeight, maxHeight)` (FR-001/002/003). |
| `isComposing` | IME composition in progress (web: `nativeEvent.isComposing`; native: implicit via `onSubmitEditing`). |

## Chat status (referenced from spec 006)

The host passes a chat status that drives the controls:

| Status | Send | Stop |
|---|---|---|
| `idle` | enabled if draft non-empty | hidden |
| `submitting` | disabled | shown |
| `streaming` | disabled | shown |
| `stopping` | disabled | shown |
| `error` | enabled if draft non-empty | hidden |

Spec 006 owns the exact status set and Stop semantics; the composer consumes `isBusy = status !== 'idle'` (and non-error statuses) for Stop visibility.

## Keyboard behaviour matrix

| Platform | Enter | Shift+Enter | Return (touch) |
|---|---|---|---|
| web (fine pointer) | send (FR-005) | newline (FR-005) | send |
| web (coarse pointer) | newline | newline | newline (FR-006) |
| native iOS/Android | newline (via `submitBehavior="newline"`) | newline | newline (FR-006) |

IME composition: on web, Enter during composition does not send (`isComposing` guard); on native, send happens via `onSubmitEditing` which fires after composition ends (FR-009).

## Configurable behaviour

| Prop | Values | Behaviour |
|---|---|---|
| `blurBehavior` | `'send' \| 'keep'` | On blur with non-empty draft, send or keep (FR-011). |
| `dismissKeyboardOnSend` | `boolean` | On send on a touch target, dismiss the on-screen keyboard (FR-011). |
| `maxHeight` | number | The input stops growing and scrolls internally (FR-002/003). |