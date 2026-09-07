# Implementation Plan: Shared Chat Composer

**Branch**: `spec-003-shared-chat-composer` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-shared-chat-composer/spec.md`

## Summary

Build the composer for the shared chat component: a host-controlled multiline TextInput that grows with content to a configurable max height then scrolls internally, with Send and Stop controls, platform-correct Enter/Shift+Enter and touch-return behaviour, IME-safe submission, host-configurable blur and keyboard-dismissal, and whitespace/empty/in-flight disabled states. Uses RN primitives only (no auto-grow library), with platform branching for web vs native keyboard behaviour per research.

## Technical Context

**Language/Version**: TypeScript strict mode (mandatory per constitution), React 19.2, React Native 0.86 (Expo SDK 57), react-native-web 0.21.

**Primary Dependencies**: Existing stack only: `@legendapp/list`, `react-native-marked`, `react-native-svg` (web stub), Vitest 5, `@testing-library/react` 16 (web tests), Playwright 1.63, Electron (e2e harness). No new runtime dependency.

**Storage**: N/A. The draft is host-controlled state; the composer is presentational.

**Testing**: Vitest unit suites (web/jsdom via RNW alias) for growth, keyboard, IME, and disabled states; Playwright `_electron` e2e for the acceptance scenarios.

**Target Platform**: iOS (Expo SDK 57), Windows desktop (Electron with RNW renderer).

**Project Type**: Library (shared component package) plus the existing test applications (`apps/web`, `apps/electron`).

**Performance Goals**: Typing latency in a 10,000-character draft stays within the same budget as a 10-character draft (spec edge case); height is driven by native/DOM content measurement, not per-keystroke text parsing.

**Constraints**: Component must not depend on Node, `fs`, or Electron modules in the renderer (constitution I). React, React Native, React Native Web are peer dependencies. Draft must remain controlled by the host (FR-008).

**Scale/Scope**: Single-user personal chat; one response in flight (beta); host controls draft and chat status.

## Constitution Check

Gates from `.specify/memory/constitution.md`:

- **Process Isolation (I)**: Pure renderer; no Node, `fs`, or Electron access. PASS.
- **Path Trust (II)**: No filesystem access in this spec. N/A.
- **No Data Loss (III)**: No saves. The draft is host state; the composer never discards it on re-render (FR-008) and blur behaviour is host-configurable, so no silent loss. PASS.
- **Fixed and Typed Preload API (IV)**: No IPC changes; the harness preload stays fixed. PASS.
- **Non-Negotiable Test Coverage (V)**: This spec adds user-visible behaviour; it gets a Playwright e2e suite plus Vitest unit tests. PASS.
- **Technology constraints**: Accessibility per spec 005 later; keyboard navigation and focus visible. React Native primitives shared across targets. PASS.

Re-checked after Phase 1 design: no gate violations. Keyboard/IME handling branches per platform with no reliance on the missing `submitBehavior` in RNW (research R2).

## Project Structure

### Documentation (this feature)

```text
specs/003-shared-chat-composer/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
packages/chat/
├── src/
│   ├── index.ts                    # Public exports (extended)
│   ├── components/
│   │   ├── Composer.tsx            # NEW: the composer (US1-5)
│   │   ├── SendButton.tsx          # NEW: Send control (US1, US3)
│   │   └── StopButton.tsx          # NEW: Stop control (US3)
│   ├── hooks/
│   │   └── useAutogrowHeight.ts    # NEW: content-height measurement (US2)
│   └── types.ts                    # Existing; ChatStatus referenced from spec 006 shape
├── package.json
└── tsconfig.json

packages/chat-demo/
├── src/
│   ├── ChatDemo.tsx                # Mount Composer; add Send/Stop/IME simulation
│   └── fixtures/                   # (existing)

tests/e2e/
├── launch.ts                       # Existing shared helper
└── composer.spec.ts                # NEW: spec 003 acceptance scenarios
```

**Structure Decision**: Extends the existing `packages/chat` package. New composer code under `src/components/Composer.tsx` with a focused `useAutogrowHeight` hook (the one genuinely non-trivial piece, isolated and unit-tested). The demo app gains composer controls and a simulated chat status for e2e. Unit tests sit beside their source.

## Complexity Tracking

No constitution violations. The deliberate complexity is the platform branching in keyboard handling (research R2): RNW 0.21 ignores `submitBehavior`, so the web path intercepts `onKeyPress` (Enter + no Shift + not composing → preventDefault + send), while native uses `onSubmitEditing` after `submitBehavior="newline"`. The simpler alternative (relying on `submitBehavior` everywhere) is rejected because RNW does not implement it and would insert a newline instead of sending on desktop (FR-005 failure, necolas/react-native-web#2737).