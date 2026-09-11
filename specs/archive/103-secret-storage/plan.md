# Implementation Plan: Secret Storage

**Branch**: `spec-103-secret-storage` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/103-secret-storage/spec.md`

## Summary

Finish the local secret store the app already uses. Spec 102 introduced the import path (file chooser, `safeStorage`, atomic write, a main-only `getProviderKey`). Spec 103 completes it: the user can remove a stored secret (FR-007), a file carrying more than one kind of secret is rejected with guidance, and the store now encrypts its payload with age under a random passphrase held in the OS vault (the format the future conversation encryption will use). The kind registry makes a new credential type a new entry with no change to existing secrets and no migration (FR-006). The plaintext stays in main and never crosses the preload boundary.

The work is split so the structural extraction lands first, with no behavior change, then removal and the new rejection rule as separate behavioral commits.

## Technical Context

**Language/Version**: TypeScript 5.7 strict; Node (Electron main and preload); React 19 renderer via electron-vite

**Primary Dependencies**: One new runtime dependency, `age-encryption` (FiloSottile typage, pure JS via `@noble/*`), bundled into main. At-rest protection is age passphrase mode; the passphrase is protected by Electron `safeStorage`, and the file chooser uses Electron `dialog`. The validators and the age primitives import no Electron, so they test without the OS.

**Storage**: Two files under `<appData>` (`~/.config/app-20` on every platform, overridable with `APP20_DATA_DIR` for tests): `secrets.json.age`, the ASCII-armored age encryption of a JSON object keyed by kind, and `secrets.key`, the random 256-bit age passphrase encrypted with `safeStorage`. Unknown keys are preserved on write. No migration from the older keyed `secrets.json` (beta rule).

**Testing**: Vitest for the age passphrase round-trip (`ageCipher.test.ts`), the pure validators, and the store (fake async cipher, real temp file), the IPC contract test for the new channel, and Playwright (`_electron.launch`) against the built app with the existing fake OpenRouter server for import, overwrite, rejection, and removal.

**Target Platform**: Windows desktop (beta). The age format and the store interface are free of Electron, so the iOS app (spec 106) and the future conversation encryption can share the primitive.

**Project Type**: npm-workspaces monorepo; the existing Electron desktop app.

**Performance Goals**: Add or remove does one decrypt, a one-key edit, one encrypt, and one atomic write. The passphrase is random, so scrypt uses work factor 12 (instead of the default 18 for human passphrases) to keep each read a few milliseconds.

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
│   ├── ageCipher.ts             # age passphrase encrypt/decrypt, ASCII-armored
│   ├── ageCipher.test.ts
│   ├── secretStore.ts           # age-envelope store over an injected async cipher
│   ├── secretStore.test.ts
│   ├── privateFile.ts           # 0600 file / 0700 directory helper
│   ├── appData.ts               # secrets.json.age and secrets.key paths
│   ├── appData.test.ts
│   ├── secrets.ts               # Electron adapter: safeStorage passphrase, dialog, store wiring
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

**Structure Decision**: The pieces are split by responsibility. Validators are pure. The age primitives in `ageCipher.ts` are pure Node and tested directly. The store depends only on `node:fs` and an injected async `SecretCipher`, so it tests with a fake cipher and a temp file. The permission helper is shared by both files the adapter writes. `secrets.ts` stays the Electron adapter: it owns `safeStorage`, the dialog, and the passphrase file, and keeps the exported names the IPC layer and `chatStream.ts` use. The age format is chosen so the iOS app and the future conversation encryption reuse one primitive.

## Complexity Tracking

No constitution violations. Decisions recorded in `research.md`: age passphrase encryption with the passphrase held in the OS vault (R1); one age envelope with a per-kind registry for extensibility and no migration (R2); structural validation with a cross-kind check (R3); idempotent removal (R4); menu-driven removal over one IPC op (R5); unit plus e2e coverage (R6); pure crypto and store split from the Electron adapter (R7). The beta no-migration rule is recorded in `AGENTS.md`.
