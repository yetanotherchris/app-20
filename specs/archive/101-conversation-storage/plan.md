# Implementation Plan: Conversation Storage

**Branch**: `spec-101-conversation-storage` | **Date**: 2026-09-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/101-conversation-storage/spec.md`

## Summary

Implement the beta conversation storage layer as a platform-neutral package (`@app-20/conversation-storage`) that owns the app-owned OpenAI-compatible schema, one JSON file per conversation, and a JSON manifest, behind a storage port interface. The package has no Node, Electron, or React dependency so the iOS app (spec 106) reuses it unchanged. The Electron app supplies a filesystem port built on the existing path validation and atomic write, exposes the store to the renderer through fixed named IPC operations, and reconciles the manifest against the folder at startup. This replaces the provisional envelope the shell persisted under spec 100 (`file:read`/`file:write`/`folder:list`); the shell now delegates to the store.

## Technical Context

**Language/Version**: TypeScript 5.7 strict; Node (Electron main and preload); React 19 renderer via electron-vite

**Primary Dependencies**: No new runtime dependency in the shared package. The Electron main process reuses `apps/electron/src/main/paths.ts` (path validation) and `apps/electron/src/main/atomicWrite.ts` (temp-file-then-rename). The renderer adapter maps between the persisted schema and `app-20-llmchat`'s `Message`; the storage package itself does not depend on the chat component.

**Storage**: Files. One `<id>.json` per conversation plus `manifest.json`, both inside the app-managed conversation folder (`<userData>/conversations`, overridable with `APP20_CONVERSATION_DIR`). SQLite is excluded.

**Testing**: Vitest for the package (in-memory port) and the Electron integration; Playwright (`_electron.launch`) for spec 101 acceptance scenarios against the built app.

**Target Platform**: Windows desktop (beta); the schema, manifest, and store are platform-neutral for iOS reuse.

**Project Type**: npm-workspaces monorepo: a new library package plus the existing Electron desktop app.

**Performance Goals**: Save round-trip under 200 ms for a conversation-sized JSON document; startup manifest read and reconciliation complete before the window restores a session.

**Constraints**: The storage package imports no Node builtins, no Electron, and no React. Renderer receives no absolute paths and no generic file operations. Writes are atomic per file. No SQLite. No provider-specific fields enter the canonical schema.

**Scale/Scope**: Single user, local first. A conversation can hold thousands of messages; the manifest holds one entry per conversation. Beta history shows at most 10 entries (spec 105); storage is uncapped.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                       | How this plan satisfies it                                                                                                                                                                                                                                                                           | Status |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Process Isolation            | The store runs in the Electron main process. The renderer reaches it only through fixed named IPC operations; the renderer still imports no `fs`/Electron. The shared package is pure TypeScript and runs wherever the host provides a port.                                                         | PASS   |
| II. Path Trust                  | The Electron port validates every conversation file name with `assertPathWithinFolder` against the resolved real conversation folder before read or write. The manifest name is a fixed constant, not renderer input. Renderer-visible errors carry a code and a path-free message.                  | PASS   |
| III. No Data Loss               | Each conversation file and the manifest are written with `atomicWriteFile` (temp file in the same directory, `fsync`, rename). A crash between the content write and the manifest write leaves the content file intact; startup reconciliation repairs the manifest rather than discarding the file. | PASS   |
| IV. Fixed and Typed Preload API | The preload exposes named `conversations:*` operations with explicit request and response types in `src/shared/ipc-contract.ts`. No generic `invoke(channel, ...args)` is exposed and no `any` crosses the boundary.                                                                                 | PASS   |
| V. Non-Negotiable Test Coverage | Unit tests cover the schema (round-trip, tolerant read, status normalization), the manifest (upsert, drop-missing, repair-orphan), filename uniqueness, and the store (save, load, reconcile, corrupt file). The e2e suite covers the spec 101 acceptance scenarios against the built app.           | PASS   |

No violations. Complexity Tracking is not required. Removing the generic `file:*` channels in favour of named `conversations:*` operations tightens Principle IV rather than relaxing it.

## Project Structure

### Documentation (this feature)

```text
specs/101-conversation-storage/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 decisions
├── data-model.md        # Phase 1 entities, schema, reconciliation
├── quickstart.md        # Phase 1 validation guide
├── contracts/           # Phase 1 package and IPC contracts
│   └── conversation-storage.md
└── tasks.md             # Phase 2 task list
```

### Source Code (repository root)

```text
packages/conversation-storage/
├── package.json                    # @app-20/conversation-storage (source entry, no build)
├── tsconfig.json
└── src/
    ├── index.ts                    # public re-exports
    ├── schema.ts                   # Conversation/Message types, parse, serialize, status normalization
    ├── schema.test.ts
    ├── filename.ts                 # conversation file name and unique-name selection
    ├── filename.test.ts
    ├── manifest.ts                 # manifest types, upsert, remove, reconcile helpers
    ├── manifest.test.ts
    ├── store.ts                    # ConversationFilePort + createConversationStore
    ├── store.test.ts
    └── testing.ts                  # in-memory ConversationFilePort for tests

apps/electron/src/
├── shared/
│   ├── ipc-contract.ts             # add conversations:* channels; remove file:* and folder:list
│   └── error-codes.ts              # extend codes for manifest/corrupt cases
├── main/
│   ├── conversationStore.ts        # filesystem port + store instance + reconcile
│   ├── conversationStore.test.ts
│   ├── ipc.ts                      # register conversations:* handlers
│   └── index.ts                    # reconcile before the window opens
├── preload/
│   └── index.ts                    # named conversations:* bridge methods
└── renderer/src/
    ├── conversation/conversationAdapter.ts   # Message <-> Conversation mapping (replaces storedConversation.ts)
    ├── hooks/useShellSession.ts              # uses conversations:list/read/save
    └── errorMessages.ts                      # map new error codes

tests/e2e/
├── conversation-storage.spec.ts    # spec 101 acceptance scenarios
├── launch-shell.ts                 # add manifest-aware seeding helpers
└── shell.spec.ts                   # filter the manifest out of conversation-file counts
```

**Structure Decision**: The schema, manifest, filename, and store live in `packages/conversation-storage` because spec 101 FR-012 requires the storage and schema layer to run unchanged on iOS, where Electron is absent. The package depends only on an injected `ConversationFilePort`, so the Electron main process and the iOS app each provide their own port. The Electron integration stays in `apps/electron/src/main` (path-validated, atomic filesystem port and IPC) and `apps/electron/src/renderer` (chat-component adapter), matching the existing shell split. Unit tests sit beside their modules as `*.test.ts`, matching `vitest.config.ts`. The spec 101 e2e suite is added as `tests/e2e/conversation-storage.spec.ts`, and the existing shell suite is adjusted only to exclude `manifest.json` from conversation-file counts.

## Complexity Tracking

No constitution violations. One cross-spec boundary is recorded in `research.md`: R9 replaces the shell's generic `file:*` operations with named `conversations:*` operations. The draft field retained on the conversation envelope is recorded in the spec's Clarifications.
