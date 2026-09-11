# Implementation Plan: Chat History Drawer

**Branch**: `spec-105-chat-history-drawer` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/105-chat-history-drawer/spec.md`

## Summary

Add a toggled history drawer to the chat screen: a left-side overlay with a scrim, a New conversation action at the top, and a list of the ten most recent conversations from the spec 101 manifest (title, model, date). Selecting an entry reads it through the existing `conversations:read` channel and loads its messages and saved draft into the active session; starting a new conversation or switching away first persists the current conversation so no words are lost until spec 107 autosave lands. The drawer is a presentational React Native component with no Node or Electron imports, so the Electron shell and the iOS app (spec 106) can both use it. No new IPC channel, main-process change, or storage format change is required.

## Technical Context

**Language/Version**: TypeScript 5.7 strict; React 19 in the renderer via electron-vite and react-native-web; no main-process code changes.

**Primary Dependencies**: `react-native` / `react-native-web` (`View`, `Pressable`, `ScrollView`, `Text`, `StyleSheet`) and the existing `app-20-llmchat` session, plus `@app-20/conversation-storage` `ManifestEntry` and `Conversation` types. No new dependency.

**Storage**: Reads the existing spec 101 JSON manifest and one-file-per-conversation layout through `conversations:list` and `conversations:read`. No schema or layout change.

**Testing**: Vitest with jsdom and `@testing-library/react` for the pure history helpers, the `useConversationHistory` hook, and the `HistoryDrawer` component; one Playwright `_electron.launch` suite (`tests/e2e/chat-history.spec.ts`) for the spec 105 acceptance scenarios against the built app.

**Target Platform**: Windows desktop (beta). The drawer component and helpers carry no Node or Electron import so spec 106 can reuse them.

**Project Type**: npm-workspaces monorepo; this feature touches only the Electron renderer and the e2e suite.

**Performance Goals**: The list is at most ten manifest entries; opening the drawer issues one `conversations:list` call. Selecting an entry issues one `conversations:read` plus the same automatic save the New conversation path already performs.

**Constraints**: Renderer has no Node, `fs`, or Electron module (constitution I). No new preload surface (constitution IV): the drawer uses existing named operations. A switch or New conversation must not lose the current conversation, so it persists first and aborts on failure (constitution III). No `any`; strict types throughout.

**Scale/Scope**: Single user, tens to hundreds of stored conversations, ten shown.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                       | How this plan satisfies it                                                                                                                                                                                                                                                                | Status |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Process Isolation            | The drawer is renderer-only and reads conversations through the fixed `window.appBridge` methods. It imports no Node, `fs`, or Electron module.                                                                                                                                           | PASS   |
| II. Path Trust                  | No path or file access is added. Listing and reading go through `conversations:list` and `conversations:read`, which already validate names in main against the resolved conversation folder. Renderer errors render from typed codes only.                                               | PASS   |
| III. No Data Loss               | Switching to another conversation or starting a new one saves the current dirty conversation first and aborts the switch if that save fails; the in-session content stays on screen. Opening or closing the drawer never discards the draft. No existing save test is weakened.           | PASS   |
| IV. Fixed and Typed Preload API | No channel is added. The drawer reuses `conversations:list` and `conversations:read` and their existing result types; no generic `invoke` and no `any` cross the boundary.                                                                                                                | PASS   |
| V. Non-Negotiable Test Coverage | Unit tests cover the recent-entry cap, the untitled/model/date presentation, and the hook's list and switch behavior; the e2e suite covers browse, resume, new conversation, empty state, untitled and corrupt entries. Existing path, save, autosave, and IPC shape tests are unchanged. | PASS   |

No violations. Complexity Tracking is not required.

## Project Structure

### Documentation (this feature)

```text
specs/105-chat-history-drawer/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 decisions
├── data-model.md        # Phase 1 entities and state
├── quickstart.md        # Phase 1 validation guide
├── contracts/           # Phase 1 renderer contracts
│   └── chat-history-drawer.md
└── tasks.md             # Phase 2 task list
```

### Source Code (repository root)

```text
apps/electron/src/renderer/src/
├── App.tsx                                    # own drawer open state; wire list, select, new
├── components/
│   ├── ShellTopBar.tsx                        # add the history toggle control
│   ├── HistoryDrawer.tsx                      # new presentational overlay
│   └── HistoryDrawer.test.tsx
├── history/
│   ├── historyEntries.ts                      # pure selectors: cap, title/model/date labels
│   └── historyEntries.test.ts
└── hooks/
    ├── useConversationHistory.ts              # list recent entries, refresh, report failures
    ├── useConversationHistory.test.tsx
    └── useShellSession.ts                     # add conversationId and openConversation

tests/e2e/
└── chat-history.spec.ts                       # spec 105 acceptance scenarios
```

**Structure Decision**: The drawer is shell chrome, not content, so it lives beside `ShellTopBar` and `Notifications` in `renderer/src/components`. Presentation rules that can be tested without React go in `renderer/src/history/historyEntries.ts`, and list-orchestration goes in a named hook `useConversationHistory` per coding standards section 7. Session switching stays in `useShellSession` because it owns the messages, draft, and base-conversation refs and must coordinate with streaming and saving. The component is Electron-free and receives data and callbacks only, so spec 106 can lift it into the iOS app. The external `app-20-llmchat` package exposes no left-drawer slot and is not modifiable from this repository; see research R1.

## Complexity Tracking

No constitution violations. Decisions recorded in `research.md`: the shell-side drawer component instead of an external-package slot (R1); reuse of the existing list and read channels with no new IPC (R2); switch semantics that save first (R3); streaming preserved across open and close (R4); presentation and date rules (R5); corrupt and missing entry handling (R6).
