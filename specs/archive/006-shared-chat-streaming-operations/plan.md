# Implementation Plan: Shared Chat Streaming and Operations

**Branch**: `spec-006-shared-chat-streaming-operations` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/archive/006-shared-chat-streaming-operations/spec.md`

## Summary

Give the shared chat component an operation-aware streaming controller. A new `useChatSession` hook owns the conversation's messages, chat status, and per-operation identity: it streams response chunks incrementally, renders partial Markdown as it goes, applies the runtime message status vocabulary (queued, sending, streaming, complete, stopped, error), rejects updates from superseded operations, retains partial content on stop, replaces failed or completed responses in place on retry and regenerate, and suppresses duplicate send and stop events. `Chat` itself stays presentational and unchanged: spec 005 already renders the statuses and per-message actions it needs. Hosts wire the network transport into the hook; the component never touches the draft or the clipboard directly.

## Technical Context

**Language/Version**: TypeScript strict mode (mandatory per constitution), React 19.2, React Native 0.86 (Expo SDK 57), react-native-web 0.21.2.

**Primary Dependencies**: Existing stack only. No new dependency. The hook is plain React state + refs; the transport is a host callback.

**Storage**: N/A. The component remains presentational and transient statuses are never persisted (FR-012); spec 101 owns the persisted vocabulary.

**Testing**: Vitest unit suites for the `useChatSession` state machine (operation identity, stale-update rejection, stop/retry/regenerate semantics, copy delegation, duplicate-event suppression, conversation-replacement isolation). Playwright `_electron` e2e for the acceptance scenarios using the demo's deterministic timer-based transport. The packaged-artifact vitest project covers the new public surface.

**Target Platform**: iOS and Windows desktop, one implementation via RNW.

**Project Type**: Library (shared component package) plus the existing test applications and the demo host.

**Performance Goals**: Streaming chunk appends are O(1) for the hook's own bookkeeping (content accumulation). Each chunk rebuilds the message array once, which is O(n) in message count and inherent to immutable message updates; the existing LegendList virtualization keeps rendering bounded. The transport is responsible for bounded chunk volume.

**Constraints**: No Node, `fs`, or Electron in the renderer (constitution I). The hook must not touch the composer draft (FR-009, draft semantics owned by spec 003). Transient statuses must not be persisted (FR-012). The renderer must not read the clipboard directly (copy is delegated to the host, matching `onCopyCode`).

**Scale/Scope**: Single-user personal chat; one response in flight (beta). Keeping both retry/regenerate attempts is future work (spec assumption).

## Constitution Check

Gates from `.specify/memory/constitution.md`:

- **Process Isolation (I)**: Pure renderer work. The hook manages React state and calls host callbacks; nothing touches Node, `fs`, or Electron. Copy is delegated to the host. PASS.
- **Path Trust (II)**: No filesystem access. N/A.
- **No Data Loss (III)**: No saves. Stop and failure retain partial content; retry/regenerate replace in place by spec; nothing discards user or response content. PASS.
- **Fixed and Typed Preload API (IV)**: No IPC changes. The new public surface is typed props and hook options, never a generic escape hatch. PASS.
- **Non-Negotiable Test Coverage (V)**: This spec adds user-visible behavior; it gets a Playwright e2e suite, Vitest unit suites, and packaged-artifact coverage. PASS.
- **Technology constraints**: The component stays shared native/web. The status vocabulary and chat-status reflection are already on the `Chat` surface from spec 005. PASS.

Re-checked after Phase 1 design: no gate violations. The one deliberate complexity is the operation state machine in `useChatSession` (research R1/R2); the simpler alternative (letting hosts arbitrate stale updates and stop races) fails FR-004/005/006 at the component boundary.

## Project Structure

### Documentation (this feature)

```text
specs/archive/006-shared-chat-streaming-operations/
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
│   ├── index.ts                    # Edit: export the session surface
│   ├── session/
│   │   ├── types.ts                # NEW: ChatOperation, ChatSessionControls, ChatSessionOptions, ChatSession
│   │   ├── useChatSession.ts       # NEW: the operation state machine hook (R1)
│   │   └── useChatSession.test.ts  # NEW: unit suite for the state machine
│   ├── components/                 # (unchanged; spec 005 renders statuses and actions)
│   ├── accessibility/              # (unchanged)
│   └── theme/                      # (unchanged)

packages/chat-demo/
├── src/
│   ├── ChatDemo.tsx                # Edit: drive Chat through useChatSession with a fake transport
│   └── fixtures/                   # (existing)

tests/e2e/
├── launch.ts                       # Existing shared helper
└── streaming-operations.spec.ts    # NEW: spec 006 acceptance scenarios

tests/package/
└── chat-package.test.tsx           # Edit: cover the session surface through dist/
```

**Structure Decision**: Extends the existing `packages/chat` package with a `session/` module. The hook owns messages, chat status, and the current operation; `Chat` and its components are untouched. The demo swaps its hand-rolled streaming state for `useChatSession` with a timer-based fake transport so the acceptance scenarios run deterministically.

## Complexity Tracking

No constitution violations. The one deliberate complexity is the operation state machine (research R1/R2), with the rejected simpler alternative recorded there.
