# Implementation Plan: Secret Storage

**Branch**: `spec-103-secret-storage` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/103-secret-storage/spec.md`

## Summary

Finish the local secret store the app already uses. Spec 102 introduced the import path (file chooser, `safeStorage` encryption, atomic write to `<appData>/secrets.json`, a main-only `getProviderKey`). Spec 103 makes that store a first-class, extensible component and closes the requirements the import path does not cover: the user can remove a stored secret (FR-007), a file carrying more than one kind of secret is rejected with guidance, and the kind registry makes a new credential type (for example an OAuth token) a new entry with no change to existing secrets and no migration (FR-006). The plaintext stays in main and never crosses the preload boundary.

The work is split so the structural extraction lands first, with no behavior change, then removal and the new rejection rule as separate behavioral commits.

## Technical Context

**Language/Version**: TypeScript 5.7 strict; Node (Electron main and preload); React 19 renderer via electron-vite

**Primary Dependencies**: No new dependency. At-rest protection uses Electron `safeStorage`; the file chooser uses Electron `dialog`. The pure validators import nothing but the shared error contract. The store uses `node:fs` and the existing `atomicWriteFile`.

**Storage**: One JSON file at `<appData>/secrets.json` (`~/.config/app-20` on every platform, overridable with `APP20_DATA_DIR` for tests). Each entry is the JSON-serialized `safeStorage` ciphertext (the `Buffer` object) of one secret, keyed by kind, matching VS Code's `EncryptionMainService`. Unknown keys are preserved on write.

**Testing**: Vitest for the pure validators and the store (fake cipher, temp file), the IPC contract test for the new channel, and Playwright (`_electron.launch`) against the built app with the existing fake OpenRouter server for import, overwrite, rejection, and removal.

**Target Platform**: Windows desktop (beta). The validators and the store interface are free of Electron so the iOS app (spec 106) can supply its own picker and cipher.

**Project Type**: npm-workspaces monorepo; the existing Electron desktop app.

**Performance Goals**: A secret import or removal completes in one file read and one atomic write. No measurable startup cost; the store is read on demand.

**Constraints**: Renderer receives no secret material, only booleans and typed error codes (FR-005). Secrets live outside the conversation folder and are never uploaded (FR-002). No generic IPC escape hatch (constitution IV). Adding a credential kind needs no migration (FR-006).

**Scale/Scope**: Single user, a handful of secret kinds, one secret file per device.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | How this plan satisfies it | Status |
| --- | --- | --- |
| I. Process Isolation | The ciphertext, the cipher, and the file chooser live in main. The renderer reaches them only through `secrets:*` operations and receives booleans or a typed code. The pure modules import no Electron and no `fs` beyond Node. | PASS |
| II. Path Trust | The secret file path is derived from the app data directory, not from renderer input. No renderer-supplied path is opened. Error messages carry a code and a fixed string, never a path. | PASS |
| III. No Data Loss | Writes are atomic and preserve other kinds; a failed write leaves the previous file intact and the error is reported. Removal is explicit and reversible by re-import. | PASS |
| IV. Fixed and Typed Preload API | One named operation, `secrets:remove`, is added to the shared contract with explicit request and response types. It is added to `IPC_CHANNELS` and to the contract test. No generic `invoke` is exposed and no `any` crosses the boundary. | PASS |
| V. Non-Negotiable Test Coverage | The IPC channel contract test is updated for the new channel. Validators and store get unit tests. The spec 103 acceptance scenarios get a Playwright suite against the fake OpenRouter server that proves the stored key is the one sent and the missing-key path after removal. | PASS |

No violations. Complexity Tracking is not required.

## Project Structure

### Documentation (this feature)

```text
specs/103-secret-storage/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 decisions
├── data-model.md        # Phase 1 entities, validation, transitions
├── quickstart.md        # Phase 1 validation guide
├── contracts/
│   └── secret-store.md  # Store interface, IPC, menu, secrecy rules
└── tasks.md             # Phase 2 task list
```

### Source Code (repository root)

```text
apps/electron/src/
├── shared/
│   ├── ipc-contract.ts          # add secrets:remove and removeSecret; MenuCommand values
│   └── error-codes.ts           # add multiple-secrets
├── main/
│   ├── secretKinds.ts           # pure kind registry and validators
│   ├── secretKinds.test.ts
│   ├── secretStore.ts           # kind-keyed encrypted file store (injected cipher)
│   ├── secretStore.test.ts
│   ├── secrets.ts               # Electron adapter: safeStorage cipher, dialog, store wiring
│   ├── ipc.ts                   # register secrets:remove
│   ├── ipc-contract.test.ts     # expected channel list
│   └── menu.ts                  # add the two remove entries
├── preload/
│   └── index.ts                 # removeSecret
└── renderer/src/
    └── App.tsx                  # handle remove-provider-key / remove-s3-credentials

tests/e2e/
├── secret-storage.spec.ts       # spec 103 acceptance scenarios
├── app-bridge.d.ts              # removeSecret type
└── shell.spec.ts                # bridge method list and menu assertion
```

**Structure Decision**: The store and validators are split by responsibility. Validators are pure and depend only on the shared error codes, so they test without Node or Electron. The store depends only on `node:fs` and an injected `SecretCipher`, so it tests with a fake cipher and a temp file. `secrets.ts` stays the Electron adapter and keeps the same exported names the IPC layer and `chatStream.ts` already use. This keeps the existing import behavior and adds removal without widening the renderer surface.

## Complexity Tracking

No constitution violations. Decisions recorded in `research.md`: `safeStorage` for at-rest protection (R1); one file with a per-kind registry for extensibility (R2); structural validation with a cross-kind check (R3); idempotent removal (R4); menu-driven removal over one IPC op (R5); unit plus e2e coverage (R6); structural extraction before behavioral commits (R7).
