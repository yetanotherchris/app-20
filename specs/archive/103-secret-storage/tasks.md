# Tasks: Secret Storage

**Input**: Design documents from `/specs/103-secret-storage/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/secret-store.md

**Tests**: The constitution requires unit tests for new pure logic and the IPC contract shape, and the workflow requires one Playwright suite for user-visible behaviour. Tests are included below.

**Organization**: Tasks are grouped by user story. Setup and Foundational phases block all stories. Spec 102 already shipped the import path; the Foundational phase extracts it into a testable store with no behavior change, and the story phases add the missing behaviour.

**Amendment**: The store was later changed from per-value `safeStorage` ciphertext to an age-encrypted envelope under a vault-held passphrase (research R1, spec 108). Tasks T004 and T006 below describe the original cipher; the current store contract is `contracts/secret-store.md`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Electron app: `apps/electron/src/{main,preload,renderer,shared}`
- Unit tests: `**/*.test.ts` beside the module
- E2E: `tests/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the existing import path from spec 102 and the pointers this feature builds on.

- [x] T001 Confirm the spec 102 import code in `apps/electron/src/main/secrets.ts`, the `secrets:*` channels in `apps/electron/src/shared/ipc-contract.ts`, and the menu entries in `apps/electron/src/main/menu.ts` still compile and pass `npm run test`; note the baseline in the PR.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extract the pure kind registry and the kind-keyed store from `secrets.ts`. This is a structural change with no behavior change, landed as its own commit.

**⚠️ CRITICAL**: No user story work begins until this phase is complete.

- [x] T002 Create `apps/electron/src/main/secretKinds.ts`: `SecretKindDefinition`, `ValidationResult`, `SECRET_KINDS` registry (`provider-key` -> storage key `providerKey`, `s3` -> storage key `s3`), and `validateSecret(kind, raw)` with the provider-key and S3 rules from `data-model.md`. No Electron import.
- [x] T003 Create `apps/electron/src/main/secretKinds.test.ts`: provider-key accepts a plain token and a token plus trailing newline, rejects empty, over-length, internal whitespace, and a second line; S3 accepts a valid pair and canonicalizes, rejects non-JSON and missing fields.
- [x] T004 Create `apps/electron/src/main/secretStore.ts`: `SecretCipher`, `SecretStore`, and `createSecretStore({ filePath, cipher })` with `status`, `read`, `write`, and `remove`, using `atomicWriteFile`, preserving unknown keys, and treating a missing or corrupt file as empty per `contracts/secret-store.md`.
- [x] T005 Create `apps/electron/src/main/secretStore.test.ts` with a fake cipher and a temp file: status booleans, read round-trip, decrypt-failure null, write preserves other entries, remove deletes only the target, remove on absent is a no-op, and a corrupt file reads empty.
- [x] T006 Refactor `apps/electron/src/main/secrets.ts` to build `createSecretStore` with a `safeStorage` cipher and keep the exported names `getSecretsStatus`, `getProviderKey`, `importProviderKey`, and `importS3Credentials` with identical behavior; the file chooser and cap stay here.
- [x] T007 Run `npm run lint`, `npm run typecheck`, and `npm run test`; the refactor must leave every existing test green. Commit as the structural change before any behavior change.

**Checkpoint**: The store and validators are unit-tested without Electron, and the app behaves exactly as before.

---

## Phase 3: User Story 1 - Import the AI provider key (Priority: P1)

**Goal**: Importing a provider key validates it, stores it encrypted, replaces an existing key, and the next request uses it. A malformed or multi-secret file is rejected with a clear message and stores nothing.

**Independent Test**: Import a key file, send a prompt, and confirm the request carries that key. Import a malformed file and a multi-secret file and confirm a clear rejection and an unchanged status.

- [x] T008 [P] [US1] Add `multiple-secrets` to `APP_ERROR_CODES` and `ERROR_MESSAGES` in `apps/electron/src/shared/error-codes.ts` with the fixed, path-free message from `data-model.md`.
- [x] T009 [US1] Extend `validateSecret('provider-key', raw)` in `apps/electron/src/main/secretKinds.ts` to reject a JSON file that carries another kind's fields with `multiple-secrets`, and cover it plus the trailing-newline cleanup in `apps/electron/src/main/secretKinds.test.ts`.
- [x] T010 [US1] Update `importProviderKey` in `apps/electron/src/main/secrets.ts` to call `validateSecret` and store the normalized value, mapping a validation failure to its code so nothing is stored.
- [x] T011 [US1] Add the US1 e2e cases to `tests/e2e/secret-storage.spec.ts`: import and send through the fake server asserting the `Authorization` header carries the imported key; re-import and assert the next request uses the new key (SC-002); a malformed key file is rejected and the status is unchanged; a multi-secret file is rejected with the `multiple-secrets` message and nothing is stored.
- [x] T012 [P] [US1] Add `removeSecret` to `tests/e2e/app-bridge.d.ts`.

**Checkpoint**: US1 works end to end; the key never reaches the renderer and is never written in plaintext.

---

## Phase 4: User Story 2 - Import S3 credentials (Priority: P1)

**Goal**: Importing S3 credentials validates the pair, stores it encrypted, and replaces an existing pair. A malformed file is rejected with a clear message and stores nothing.

**Independent Test**: Import a valid credentials file and confirm the S3 status is present; import a malformed file and confirm the status is unchanged.

- [x] T013 [US2] Update `importS3Credentials` in `apps/electron/src/main/secrets.ts` to call `validateSecret('s3', raw)` and store the canonical JSON, mapping a validation failure to its code.
- [x] T014 [US2] Add the US2 e2e cases to `tests/e2e/secret-storage.spec.ts`: import a valid pair and assert the S3 status is present; import `{"accessKeyId": 5}` and assert the error notification and an unchanged status; re-import a new pair and assert the status stays present.

**Checkpoint**: US2 works; S3 sync (spec 104) can read the stored pair.

---

## Phase 5: User Story 3 - Remove a stored secret (Priority: P2)

**Goal**: The user removes a stored secret; the dependent feature then fails with its missing-credential error until a new secret is imported.

**Independent Test**: Remove the stored provider key and confirm the next send fails with the missing-key error and no request reaches the server. Remove stored S3 credentials and confirm the status clears.

- [x] T015 [US3] Add `secrets:remove` to `IpcContract`, `IPC_CHANNELS`, and `removeSecret(kind)` to `AppBridge` in `apps/electron/src/shared/ipc-contract.ts`; add `remove-provider-key` and `remove-s3-credentials` to `MenuCommand`.
- [x] T016 [US3] Add `removeSecret(kind)` to `createSecretStore` in `apps/electron/src/main/secretStore.ts`, rejecting an unknown kind with `invalid-secret` (idempotent for a known kind), and cover it in `apps/electron/src/main/secretStore.test.ts`.
- [x] T017 [US3] Register the `secrets:remove` handler in `apps/electron/src/main/ipc.ts` and add `removeSecret` to the preload bridge in `apps/electron/src/preload/index.ts`.
- [x] T018 [US3] Add the two remove entries to `apps/electron/src/main/menu.ts`.
- [x] T019 [US3] Handle `remove-provider-key` and `remove-s3-credentials` in `apps/electron/src/renderer/src/App.tsx`, calling `removeSecret` and pushing a success or typed-error notification.
- [x] T020 [US3] Add the US3 e2e cases to `tests/e2e/secret-storage.spec.ts`: remove the provider key, assert the status clears, send a prompt, and assert the missing-key message and that the fake server received no new request; remove S3 and assert the status clears.
- [x] T021 [P] [US3] Update the expected channel list in `apps/electron/src/main/ipc-contract.test.ts` for `secrets:remove`.

**Checkpoint**: US3 works; a stored secret can be revoked and the app reports the missing credential.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Align the existing suites, run the gates, and archive the spec.

- [x] T022 Update `BRIDGE_METHODS` in `tests/e2e/shell.spec.ts` for `removeSecret`, and add the remove menu labels to the menu assertion.
- [x] T023 Confirm no secret plaintext reaches a log, error, or the renderer: review `apps/electron/src/main/secrets.ts`, `secretStore.ts`, and `ipc.ts`; assert in a unit test that a validation failure and a decrypt failure produce a fixed message with no key material.
- [x] T024 Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build:electron`; fix all failures.
- [x] T025 Run `npm run test:e2e`; fix all failures.
- [x] T026 Format changed files with Prettier (the local `format:check` misreports CRLF on Windows; confirm on CI).
- [x] T027 Move the spec to `specs/archive/103-secret-storage` with `git mv` and set `**Status**` to `Archived`.

---

## Dependencies & Execution Order

- Setup (Phase 1) → Foundational (Phase 2) → user stories.
- US1 and US2 depend on the Foundational store and validators; they touch the same `secrets.ts` and `secret-storage.spec.ts`, so run them in order.
- US3 depends on the Foundational store and adds the IPC, preload, menu, renderer, and e2e removal path.
- Polish depends on all stories.

### Parallel Opportunities

- T002/T003 and T004/T005 are independent pure modules and tests.
- T008 is independent of the store work.
- T012 is independent of the surrounding e2e authoring.
- T021 touches a separate file from the removal wiring.
- T022 touches a separate file from the removal wiring.

## Implementation Strategy

The Foundational extraction lands first as a structural commit with all tests green, so the behavior change is reviewed on its own. US1 and US2 finish validation and prove the stored key is used end to end. US3 adds removal, which is the requirement spec 102 did not cover. The e2e suite drives the real built app through the fake OpenRouter server, so the assertion that a request carries the imported key and that removal stops requests is checked on the wire.

## Notes

- The plaintext of a secret is produced and consumed in main only; the renderer receives booleans and typed codes.
- Removal is idempotent and needs no confirmation dialog in beta; re-importing restores the dependent feature.
- The on-disk shape stays compatible with spec 102, so no migration runs.
