# Research: Shared Chat Composer

**Date**: 2026-09-07 | **Spec**: 003-shared-chat-composer

## R1: Auto-growing multiline TextInput

**Decision**: Build with RN primitives: `multiline` TextInput, height driven from `onContentSizeChange` clamped to `[minHeight, maxHeight]`, with `onLayout` and `onChangeText` as fallback triggers. No third-party auto-grow library.

**Rationale**: Every dedicated auto-grow library is unmaintained (wix `react-native-autogrow-textinput`, archived), a full framework (gifted-chat), or a large dependency (`react-native-ui-lib`). None solve the two cross-platform bugs in one place. The RN-primitive pattern is ~60 lines, keeps the draft host-controlled (FR-008), and matches the spec exactly.

**Cross-platform traps to encode**:
- RNW `onContentSizeChange` does not fire when content shrinks (expo/expo#35294); recompute height from `onChangeText` too.
- iOS Fabric `onContentSizeChange` may fire only once on mount (react/react-native#52854); update height from `onLayout` as a fallback.
- Past `maxHeight`, clamp the input's height to the cap so it scrolls internally (FR-003) instead of growing forever.

**Source**: reactnative.dev/docs/textinput; RNW TextInput source; expo/expo#35294; react/react-native#52854; wix archived README.

## R2: Enter vs Shift+Enter and IME

**Decision**: Branch per platform. On web, intercept `onKeyPress` with `key === 'Enter'`, require `!shiftKey` and `!nativeEvent.isComposing`, and `preventDefault()` to suppress the newline before sending (FR-005, FR-009). On native, send via `onSubmitEditing` (fires only on actual submit, after composition ends) and rely on `submitBehavior="newline"` for multiline so bare return inserts a newline (FR-006).

**Rationale**: RNW 0.21 does not implement `submitBehavior` (necolas/react-native-web#2737 open); it reads only `blurOnSubmit`. RNW's `handleKeyDown` already guards Enter with `isEventComposing` (keyCode 229) so web IME does not prematurely submit, and it carries `e.shiftKey`/`e.key`. On native, RN `onKeyPress` fires during IME composition and there is no `preventDefault`, so `onSubmitEditing` is the robust IME-safe path. Treating both iOS and Android as "touch" (return inserts newline, FR-006) matches the spec.

**Source**: necolas/react-native-web#2737, #2817; RNW TextInput `handleKeyDown`; reactnative.dev/docs/textinput (`submitBehavior`, `onSubmitEditing`, `onKeyPress` Android limitation).

## R3: Blur and keyboard-dismissal configuration

**Decision**: The host configures blur behaviour via a `blurBehavior` prop (`'send' | 'keep'`) and keyboard dismissal via a `dismissKeyboardOnSend` prop. On web, blur-to-send is implemented in the composer's own `onBlur` handler (send if non-empty and not composing). On native, `submitBehavior`/`blurOnSubmit` govern submit-on-return; keyboard dismissal after send uses `Keyboard.dismiss()` when configured.

**Rationale**: FR-011 requires the host to choose. Since RNW ignores `submitBehavior`, the composer owns the web blur logic; native uses RN's submit behaviour. Keyboard dismissal is delegated to `Keyboard.dismiss()` on touch targets only.

## R4: Touch vs desktop detection

**Decision**: On web, use `window.matchMedia('(pointer: coarse)').matches` for touch detection (FR-006), falling back to desktop when the primary pointer is fine. On native iOS/Android, treat both as touch.

**Rationale**: `Platform.OS` tells platform, not input type. A touchscreen laptop reports both coarse and fine pointers; using the *primary* `(pointer: coarse)` matches desktop Enter-submits while phones get return-inserts-newline. This is how Ionic handles the same split.

**Source**: MDN `@media/pointer`; ionic#19942.

## R5: Send/Stop controls and in-flight state

**Decision**: Send is disabled when the draft is empty or whitespace-only (FR-004), and while a response is in flight (FR-012). Stop shows when submission/streaming can be cancelled (FR-007), driven by a `chatStatus` prop (`idle | submitting | streaming | ...`) per the chat status defined in spec 006. A single `submit` event fires per send; the component never queues a second send while in flight.

**Rationale**: FR-004/FR-007/FR-012 are state-driven. The composer is presentational: it renders Send disabled per `canSend`, Stop per `isBusy`, and fires one callback. Duplicate-send prevention is the host's enforcement of the disabled state plus the component's guard against firing while busy.

## R6: Whitespace-only and long-draft handling

**Decision**: Send-disabled check uses `trim().length === 0`. Typing latency in a 10,000-character draft stays bounded because the height is driven by the native/DOM content measurement, not by re-parsing the text on every keystroke; the component holds only `value` and a measured height.

**Rationale**: Edge cases require a trim-based empty check and no per-keystroke O(n) work. The controlled `value` flows through unchanged, so a long draft does not degrade typing (FR edge case).