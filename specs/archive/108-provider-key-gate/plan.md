# Implementation Plan: Provider Key Gate

**Branch**: `spec-108-provider-key-gate` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/108-provider-key-gate/spec.md`

## Summary

Intercept a submit in the renderer before `useShellSession.submit`. The gate reads the existing `secrets:status` operation, which includes both the encrypted store and `OPENROUTER_API_KEY`. If no provider key is available, it invokes the existing provider-key import flow. A successful import reports its normal notification and continues the initial submit. A cancelled or failed import sends nothing and leaves the draft unchanged.

## Technical Context

**Language/Version**: TypeScript 5.7 strict; React 19 renderer via electron-vite

**Primary Dependencies**: No new dependency. Existing fixed `secrets:status` and `secrets:import-provider-key` bridge operations.

**Storage**: No new storage. Provider keys remain in the spec 103 encrypted secret store, with `OPENROUTER_API_KEY` taking precedence.

**Testing**: Playwright against the built Electron app, with the native file chooser stubbed in the main process. The suite verifies gating, cancellation, retained draft, import followed by the original send, and environment-key bypass.

**Target Platform**: Windows desktop. The renderer flow remains independent of the desktop chooser implementation so the shared UI can use the iOS picker under spec 106.

**Project Type**: npm-workspaces monorepo; Electron desktop application.

**Performance Goals**: One on-demand status IPC call per submit. No startup secret read or plaintext exposure.

**Constraints**: The renderer receives only the existing key-availability boolean and typed result codes. A prompt must not reach `chat:start` while the gate is active. The existing provider missing-key handling remains for keys removed after the status check.

**Scale/Scope**: Single user, one provider key, one active composer.

## Constitution Check

| Principle                       | How this plan satisfies it                                                                                                                                                    | Status |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Process Isolation            | The renderer reads only the existing boolean status and invokes an existing named bridge operation. It never receives secret material or imports Node/Electron modules.       | PASS   |
| II. Path Trust                  | The renderer supplies no path. File selection and reading remain in main through spec 103.                                                                                    | PASS   |
| III. No Data Loss               | The gate calls neither `submit` nor clears the draft before availability is confirmed. Cancellation, import failure, and a later provider missing-key error retain the draft. | PASS   |
| IV. Fixed and Typed Preload API | The plan uses existing named bridge methods with their existing typed contract. No IPC channel is added.                                                                      | PASS   |
| V. Non-Negotiable Test Coverage | Playwright exercises all user-visible gate outcomes against the built application and fake provider.                                                                          | PASS   |

No violations. Complexity Tracking is not required.

## Project Structure

```text
apps/electron/src/renderer/src/
└── App.tsx                         # Check provider-key availability before a chat submit

tests/e2e/
└── provider-key-gate.spec.ts       # Spec 108 acceptance scenarios

specs/108-provider-key-gate/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md
```

## Complexity Tracking

No constitution violations. Research records the explicit-retry decision and the existing-status decision.
