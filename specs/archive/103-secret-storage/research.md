# Phase 0 Research: Secret Storage

Spec 102 already shipped a working import path in `apps/electron/src/main/secrets.ts`: a file chooser, `safeStorage` encryption, an atomic write to `<appData>/secrets.json`, a status read, and a main-only `getProviderKey` used by the chat stream. Spec 103 is the credential-storage feature itself. This research records the decisions that finish it: removal, a kind registry that satisfies FR-006, and validation that rejects a file carrying more than one secret.

## R1. At-rest protection: Electron `safeStorage`

**Decision**: Encrypt each secret with `safeStorage.encryptString` and store the ciphertext base64-encoded in `secrets.json`. Treat unavailable encryption (`isEncryptionAvailable()` false) as a hard failure (`secret-store-unavailable`); never fall back to writing plaintext.

**Rationale**: `safeStorage` is backed by the OS credential service (DPAPI on Windows, Keychain on macOS, libsecret or KWallet on Linux). It needs no new dependency and the plaintext is produced and consumed only in main, which keeps it out of renderer memory and renderer crash dumps (constitution I). On POSIX the store creates `secrets.json` with mode `0600` and narrows its directory to `0700`, so the default umask cannot leave the ciphertext group- or world-readable.

On Linux where no keyring is selected, Electron uses the `basic_text` backend and encrypts with a hardcoded key. That value is obfuscated rather than protected, but it is still kept out of the conversation workspace, is never uploaded, and is never rendered (FR-002, FR-005, FR-008). Beta targets Windows and iOS, so the decision is to accept the `basic_text` fallback rather than refuse to store on Linux; refusing would make the app unusable there for a protection the spec does not require.

**Alternatives considered**: Plaintext JSON, rejected because FR-008 and the beta threat model forbid it. `keytar`, rejected because it adds a native module for the same OS service. An age passphrase store, deferred to a future release per `docs/overview.md`. Refusing to store on the Linux `basic_text` backend, rejected because it removes Linux support for a case the spec leaves to the plan.

## R2. Store layout and extensibility: one file, one entry per kind

**Decision**: Keep one JSON file at `<appData>/secrets.json`. Each entry is keyed by the kind's storage key and holds the base64 ciphertext. A `SecretKind` registry maps each kind id to its storage key and its validator. Setting or removing a kind reads the existing object, changes only that key, and writes the object back, so any other entry, including one written by a future build, is preserved.

**Rationale**: FR-006 requires that adding a credential type (for example an OAuth token) neither rewrites existing entries nor runs a migration. A registry plus a per-key edit is exactly that: the new kind is a new registry entry, and older entries are untouched. The on-disk shape stays compatible with the `{ providerKey, s3 }` object spec 102 wrote, so no migration is needed for existing installs.

**Alternatives considered**: A separate file per kind, rejected because it multiplies atomic-write and cleanup cases without a benefit. One encrypted blob for all secrets, rejected because re-encrypting every secret on each change complicates rotation and makes a single corrupt read lose everything. SQLite, excluded from beta by the overview.

## R3. Validation and normalization

**Decision**: Validators are pure functions in `secretKinds.ts` and return either the normalized string to store or a typed error code.

- **Provider key**: trim the file; reject empty, longer than 8192 characters, or containing internal whitespace or a newline. A trailing newline or surrounding blank lines are removed by the trim, so the common "file ends with a newline" case imports cleanly; a file with an extra comment or a second line is rejected rather than stored with stray bytes.
- **S3 credentials**: parse the file as a JSON object; require non-empty string `accessKeyId` and `secretAccessKey`. Store the canonical `JSON.stringify` of those two fields so the stored value has no surrounding whitespace or extra fields.
- **One secret per file**: when the file parses as a JSON object, collect the JSON field names that identify each known kind (`accessKeyId`/`secretAccessKey` for S3). If a field belonging to a kind other than the one being imported is present, reject with `multiple-secrets`. A JSON object that identifies no other kind but is not itself valid for the requested kind is rejected as `invalid-secret`.

**Rationale**: The spec edge cases require that stray bytes never reach the store, that a malformed file is rejected with a clear message, and that a multi-secret file is rejected with guidance. Structural validation is the strongest rule that needs no network call; verifying a key against OpenRouter on import would add a surprise request and a misleading failure for an otherwise well-formed key.

**Alternatives considered**: Accepting any non-empty file, rejected because it would store an S3 JSON blob as a provider key. A provider-key regex (`sk-or-...`), rejected because the spec is provider-agnostic and beta may add providers. Only checking for the requested kind's fields, rejected because it would silently accept an S3 file as a provider key.

## R4. Removal semantics

**Decision**: `remove(kind)` deletes the kind's entry and atomically rewrites the file. Removing an entry that is not present succeeds (idempotent), so a repeated menu action is not an error. After removal the dependent feature fails through its existing missing-credential path: the chat stream returns `missing-key`, and S3 sync (spec 104) stays disabled with its status.

**Rationale**: FR-007 and SC-005. Idempotence keeps a double click from producing a spurious error and keeps the operation safe to retry.

**Alternatives considered**: Returning an error when the entry is absent, rejected as confusing for an action whose goal state is already reached.

## R5. Entry points

**Decision**: Add two `File` menu items, "Remove Provider API Key" and "Remove S3 Credentials", dispatched as new `MenuCommand` values and handled in the renderer through a single typed `secrets:remove` IPC operation. There is no confirmation dialog in beta; the action is reversible by re-importing.

**Rationale**: Mirrors the existing import menu entries and keeps the preload surface a fixed list of named operations (constitution IV).

**Alternatives considered**: A settings screen, rejected as out of beta scope. Removing from the status display, rejected because there is no such display yet.

## R6. Testing

**Decision**: Unit-test the validators and the store (with a fake cipher and a real temp file, covering status, read, write, remove, idempotent remove, and unknown-key preservation), update the IPC contract test for the new channel, and add a Playwright suite `tests/e2e/secret-storage.spec.ts` that imports a key and sends a prompt through the fake OpenRouter server, re-imports to prove overwrite, rejects malformed and multi-secret files, removes the provider key and asserts the next send fails with the missing-key message, and removes S3 credentials and asserts the status clears.

**Rationale**: Constitution V requires tests for the IPC contract shape, and the workflow requires an e2e suite for user-visible behaviour. Driving the real built app proves the stored key is actually the one sent on the wire.

## R7. Structural separation

**Decision**: Split the Electron-coupled `secrets.ts` into a pure `secretKinds.ts` (validation), a node-only `secretStore.ts` (file read/write with an injected cipher), and the Electron adapter `secrets.ts` (dialog and `safeStorage`). Land the extraction as a structural commit with no behavior change before the behavioral commits.

**Rationale**: Tidy First. The store and validators become unit-testable without Electron, and the behavior change (removal, multi-secret rejection) is reviewed on its own.
