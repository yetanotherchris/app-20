# Tasks: Provider Key Gate

**Input**: Design documents in `/specs/108-provider-key-gate/`

## Phase 1: Gate

- [x] T001 Add a pre-submit availability check in `apps/electron/src/renderer/src/App.tsx` that uses `getSecretsStatus` and reuses the provider key import operation.
- [x] T002 Preserve the draft and send no request for cancelled or failed imports in `apps/electron/src/renderer/src/App.tsx`.
- [x] T003 Retain the existing missing-key stream-start handling for a key removed after the availability check.

## Phase 2: Acceptance Coverage

- [x] T004 Add `tests/e2e/provider-key-gate.spec.ts` covering fresh-install gate, cancellation, import followed by the original send, stored-key bypass, environment-key bypass, and no provider requests after cancellation.
- [x] T005 Update prior missing-key e2e expectations to use the provider's race-condition path rather than first-run behavior.

## Phase 3: Verification

- [x] T006 Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run test:e2e`.
