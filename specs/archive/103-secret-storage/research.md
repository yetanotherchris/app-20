# Phase 0 Research: Secret Storage

Spec 102 shipped a provisional import path in `apps/electron/src/main/secrets.ts`: a file chooser, `safeStorage` encryption, an atomic write under the app data directory, a status read, and a main-only `getProviderKey` used by the chat stream. Spec 103 finishes the credential store. This research records the decisions: age passphrase encryption with the passphrase held in the OS vault, a whole-file envelope, removal, a kind registry, and validation.

## R1. At-rest protection: age with a vault-held passphrase

**Decision**: Generate a random 256-bit passphrase on first use and protect it with Electron `safeStorage` (DPAPI, Keychain, or libsecret) in `<appData>/secrets.key`. Encrypt the whole secrets payload with age passphrase mode (scrypt key derivation, ChaCha20-Poly1305) into `<appData>/secrets.json.age`, ASCII-armored. Treat unavailable `safeStorage` (`isEncryptionAvailable()` false) as a hard failure (`secret-store-unavailable`); never write plaintext.

**Rationale**: age gives one portable, well-specified format that the desktop and the future iOS app (spec 106) can share, and it is the primitive the overview already plans for conversation encryption. The passphrase is random per install, so the scrypt work factor is set to 12 instead of the default 18, which targets human passphrases; reads stay fast. `safeStorage` remains the vault seam, so the passphrase itself is protected by the OS credential service. On POSIX both `secrets.json.age` and `secrets.key` are written `0600` and the directory is narrowed to `0700`, so the default umask cannot leave them group- or world-readable.

On Linux where no keyring is selected, Electron uses the `basic_text` backend and protects the passphrase with a hardcoded key. That value is obfuscated rather than protected, but it is still kept out of the conversation workspace, is never uploaded, and is never rendered (FR-002, FR-005, FR-008). `isEncryptionAvailable()` is false in that state until `safeStorage.setUsePlainTextEncryption(true)` is called, so `secrets.ts` calls it on Linux when a keyring is absent; the call is a no-op where a real password manager exists. Beta targets Windows and iOS, so the decision is to accept the fallback rather than refuse to store on Linux.

**Alternatives considered**: `safeStorage` directly on each value (the design before this change), rejected now that age is being adopted for conversations and iOS, because it would leave three platform-specific formats and no shared primitive. An X25519 age identity in the vault, rejected by product decision in favor of a passphrase. Plaintext JSON, rejected because FR-008 and the beta threat model forbid it. `keytar`, rejected because it adds a native module for the same OS service.

## R2. Store layout and extensibility: one age envelope

**Decision**: Keep one file at `<appData>/secrets.json.age` holding the ASCII-armored age encryption of a JSON object `{ [storageKey]: string }`. A `SecretKind` registry maps each kind id to its storage key and validator. `read` decrypts the whole payload; `write` and `remove` decrypt it, change only that key, re-encrypt, and write atomically, so any other entry, including one written by a future build, is preserved. A missing file, or a payload the passphrase cannot decrypt or parse, reads as empty.

**Rationale**: FR-006 requires that adding a credential type (for example an OAuth token) neither rewrites existing entries nor runs a migration. A registry plus a per-key edit is exactly that: the new kind is a new registry entry and older entries are untouched. Encrypting the whole payload also hides which kinds exist, unlike per-value ciphertext in a plaintext JSON shell.

**No migration**: beta stores this new file name and format. The old `secrets.json` is neither read nor converted; the user imports again. This follows the AGENTS.md rule that beta carries no on-disk data migrations, so no conversion code is written.

**Alternatives considered**: Per-value age armor inside a JSON file, rejected because it leaks the kind names and structure without a benefit. A separate file per kind, rejected because it multiplies atomic-write and cleanup cases. SQLite, excluded from beta by the overview.

## R3. Validation and normalization

**Decision**: Validators are pure functions in `secretKinds.ts` and return either the normalized string to store or a typed error code.

- **Provider key**: trim the file; reject empty, longer than 8192 characters, or containing internal whitespace or a newline. A trailing newline or surrounding blank lines are removed by the trim, so the common "file ends with a newline" case imports cleanly; a file with an extra comment or a second line is rejected rather than stored with stray bytes.
- **S3 credentials**: parse the file as a JSON object; require non-empty string `accessKeyId` and `secretAccessKey`. Store the canonical `JSON.stringify` of those two fields so the stored value has no surrounding whitespace or extra fields.
- **One secret per file**: when the file parses as a JSON object, collect the JSON field names that identify each known kind (`accessKeyId`/`secretAccessKey` for S3). If a field belonging to a kind other than the one being imported is present, reject with `multiple-secrets`. A JSON object that identifies no other kind but is not itself valid for the requested kind is rejected as `invalid-secret`.

**Rationale**: The spec edge cases require that stray bytes never reach the store, that a malformed file is rejected with a clear message, and that a multi-secret file is rejected with guidance. Structural validation is the strongest rule that needs no network call; verifying a key against OpenRouter on import would add a surprise request and a misleading failure for an otherwise well-formed key.

**Alternatives considered**: Accepting any non-empty file, rejected because it would store an S3 JSON blob as a provider key. A provider-key regex (`sk-or-...`), rejected because the spec is provider-agnostic and beta may add providers. Only checking for the requested kind's fields, rejected because it would silently accept an S3 file as a provider key.

## R4. Removal semantics

**Decision**: `remove(kind)` deletes the kind's entry and atomically rewrites the envelope. Removing an entry that is not present succeeds (idempotent), so a repeated menu action is not an error. After removal the dependent feature fails through its existing missing-credential path: the chat stream returns `missing-key`, and S3 sync (spec 104) stays disabled with its status.

**Rationale**: FR-007 and SC-005. Idempotence keeps a double click from producing a spurious error and keeps the operation safe to retry.

**Alternatives considered**: Returning an error when the entry is absent, rejected as confusing for an action whose goal state is already reached.

## R5. Entry points

**Decision**: Add two `File` menu items, "Remove Provider API Key" and "Remove S3 Credentials", dispatched as new `MenuCommand` values and handled in the renderer through a single typed `secrets:remove` IPC operation. There is no confirmation dialog in beta; the action is reversible by re-importing.

**Rationale**: Mirrors the existing import menu entries and keeps the preload surface a fixed list of named operations (constitution IV).

**Alternatives considered**: A settings screen, rejected as out of beta scope. Removing from the status display, rejected because there is no such display yet.

## R6. Testing

**Decision**: Unit-test the age passphrase round-trip in `ageCipher.test.ts` (armored output, no plaintext, wrong passphrase and malformed input return null, randomized ciphertext), and the store with a fake async cipher and a real temp file (status, read, write, remove, idempotent remove, cross-kind preservation, failed-write rollback, POSIX modes). Update the IPC contract test for the new channel. Add a Playwright suite `tests/e2e/secret-storage.spec.ts` that imports a key and sends a prompt through the fake OpenRouter server, re-imports to prove overwrite, rejects malformed and multi-secret files, removes the provider key and asserts the next send fails with the missing-key message, and removes S3 credentials and asserts the status clears.

**Rationale**: Constitution V requires tests for the IPC contract shape, and the workflow requires an e2e suite for user-visible behaviour. Driving the real built app proves the stored key is actually the one sent on the wire.

## R7. Structural separation

**Decision**: Keep the validators in a pure `secretKinds.ts`, the payload store in a node-only `secretStore.ts` (file read/write with an injected async cipher), the age primitive in `ageCipher.ts`, the permission helper in `privateFile.ts`, and the Electron adapter in `secrets.ts` (dialog, `safeStorage`, passphrase file).

**Rationale**: Tidy First. The store, validators, and age cipher are unit-testable without Electron, and the behavioral change is reviewed on its own.
