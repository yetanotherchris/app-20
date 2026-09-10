# Implementation Plan: Desktop App Shell

**Branch**: `spec-100-electron-desktop-shell` | **Date**: 2026-09-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/100-electron-desktop-shell/spec.md`

## Summary

Build the Electron desktop shell for the beta app: a window that opens to the chat screen, a folder workspace that is the root for all conversation file access, a fixed typed preload API, main-process path validation and atomic writes, close/quit confirmation that never discards unsaved changes, a menu bar with workspace and secret-import entries, process isolation with a restrictive CSP, and external links routed to the system browser.

The shell owns the workspace, the file operations, the window/menu lifecycle, and the close/quit guarantee. Conversation schema and manifest are owned by spec 101; the AI provider by spec 102; secret storage by spec 103; the session flow by spec 105. The shell exposes the operations those specs will call and implements a minimal active-document save so the spec 100 acceptance scenarios are testable end to end. That boundary is recorded in `research.md` (R10) and in the spec's Assumptions.

## Technical Context

**Language/Version**: TypeScript 5.7 strict; Node (Electron main and preload); React 19 renderer via electron-vite

**Primary Dependencies**: Electron 44, electron-vite 5, Vite 7, `app-20-llmchat` (shared chat component), `react-native-web` (renderer alias), `@app-20/chat-demo` (component demo surface, retained for the existing component e2e harness)

**Storage**: Files. Workspace folder holds conversation JSON. App settings (`settings.json`) and secrets (`secrets.json`) live under `app.getPath('userData')`, outside the workspace. Secrets are encrypted at rest with Electron `safeStorage`.

**Testing**: Vitest for pure logic and IPC contract shape; Playwright (`_electron.launch`) for user-visible acceptance scenarios against the built app (`npm run test:e2e`)

**Target Platform**: Windows desktop (beta). macOS/Linux paths are handled but not a beta target.

**Project Type**: Desktop application (Electron) inside an npm-workspaces monorepo

**Performance Goals**: Window usable on launch; save round-trip under 200 ms for a conversation-sized JSON document; no renderer path touches the filesystem directly

**Constraints**: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`; renderer has no Node/`fs`/Electron; every path validated in main against the resolved real workspace root; atomic saves; no absolute path in a renderer-visible error; restrictive CSP; single instance

**Scale/Scope**: One window, one workspace, one active document. Beta is single user and local first.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | How this plan satisfies it | Status |
|-----------|----------------------------|--------|
| I. Process Isolation | `BrowserWindow` keeps `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. Renderer imports no `fs`/Electron. Privileged work is reached only through the preload bridge. | PASS |
| II. Path Trust | `assertPathWithinWorkspace` resolves the real workspace root with `fs.realpath` and rejects any resolved target outside it or any filename containing a separator. Every file handler calls it. Errors returned to the renderer carry a code, never a path. | PASS |
| III. No Data Loss | `atomicWriteFile` writes a temp file in the same directory, `fsync`s, then renames over the target. On any failure the temp file is removed and the error propagates; the renderer keeps the document dirty. Close and quit are intercepted and routed to a renderer confirmation. | PASS |
| IV. Fixed and Typed Preload API | The preload exposes a single object of named methods. Request and response types live in `src/shared/ipc-contract.ts`; no generic `invoke(channel, ...args)` is exposed. No `any` at the boundary. | PASS |
| V. Non-Negotiable Test Coverage | Unit tests cover path containment (including adversarial `..` and separator cases), atomic write success/failure, and IPC contract shape. E2E covers dirty/close/quit confirmation and launch. | PASS |

No violations. Complexity Tracking is not required.

## Project Structure

### Documentation (this feature)

```text
specs/100-electron-desktop-shell/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 decisions
├── data-model.md        # Phase 1 entities and state transitions
├── quickstart.md        # Phase 1 validation guide
├── contracts/           # Phase 1 IPC and file API contracts
│   └── ipc-and-file-api.md
└── tasks.md             # Phase 2 task list
```

### Source Code (repository root)

```text
apps/electron/
├── electron.vite.config.ts        # renderer aliases + build-time CSP injection
├── package.json
├── tsconfig.json
└── src/
    ├── main/
    │   ├── index.ts               # app lifecycle, single instance, quit/close gating
    │   ├── window.ts              # BrowserWindow creation and load
    │   ├── security.ts            # CSP, navigation and window-open guards
    │   ├── menu.ts                # application menu and accelerators
    │   ├── ipc.ts                 # registers all ipcMain handlers
    │   ├── workspace.ts           # workspace choose/create/get and root state
    │   ├── settings.ts            # userData/settings.json store
    │   ├── secrets.ts             # userData/secrets.json (safeStorage) store
    │   ├── atomicWrite.ts         # temp-file-then-rename write
    │   ├── atomicWrite.test.ts    # unit test (Vitest)
    │   ├── paths.ts               # realpath root + containment validation
    │   ├── paths.test.ts          # unit test (Vitest)
    │   ├── errors.ts              # error codes and renderer-safe mapping
    │   └── ipc-contract.test.ts   # unit test: contract shape and error codes
    ├── preload/
    │   └── index.ts               # fixed appBridge API
    ├── shared/
    │   ├── ipc-contract.ts        # typed channel contract (invoke + events)
    │   └── error-codes.ts         # shared error code union
    └── renderer/
        ├── index.html
        └── src/
            ├── main.tsx           # surface selector (shell | demo)
            ├── App.tsx            # shell composition root
            ├── components/        # onboarding, top bar, close dialog, toast
            ├── hooks/             # useWorkspace, useShellSession, useCloseGuard
            └── stubs/
                └── react-native-svg.tsx

tests/e2e/
├── launch.ts                      # existing component-harness launcher (demo surface)
├── launch-shell.ts                # shell-surface launcher
└── shell.spec.ts                  # spec 100 acceptance scenarios
```

**Structure Decision**: All spec 100 code lives under `apps/electron/src`, split by domain (`workspace`, `paths`, `atomicWrite`, `settings`, `secrets`, `menu`, `security`) so each module has one reason to change. Unit tests are placed as `*.test.ts` next to the module under `apps/electron/src`, matching the `apps/**/*.test.{ts,tsx}` include in `vitest.config.ts`. The e2e suite adds `tests/e2e/launch-shell.ts` and `tests/e2e/shell.spec.ts` next to the existing harness.

## Complexity Tracking

No constitution violations. One cross-spec boundary is recorded in `research.md` R10: the shell implements a minimal active-document persistence path while schema ownership stays with spec 101.
