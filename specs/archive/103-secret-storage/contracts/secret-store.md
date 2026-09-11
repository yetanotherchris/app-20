# Contract: Secret Store and IPC

Spec 103 lives in the Electron main process and is reached from the renderer only through the fixed preload API (constitution IV). This document fixes the internal store contract, the renderer-visible IPC additions, and the secrecy rules.

## Internal store contract (`apps/electron/src/main/secretStore.ts`)

```ts
export interface SecretCipher {
  /** Encrypt the whole payload (a JSON string) to a storable string; throw when the vault is unavailable. */
  encrypt(plaintext: string): Promise<string>
  /** Decrypt a stored payload, or return null when it cannot be decrypted. */
  decrypt(ciphertext: string): Promise<string | null>
}

export interface SecretStore {
  status(): Promise<SecretsStatus>
  read(kind: SecretKind): Promise<string | null>
  write(kind: SecretKind, plaintext: string): Promise<void>
  remove(kind: SecretKind): Promise<void>
}

export function createSecretStore(options: {
  filePath: string
  cipher: SecretCipher
}): SecretStore
```

- The cipher operates on the whole payload. `secrets.ts` supplies the age passphrase implementation; `ageCipher.ts` holds the pure primitives.
- The payload file is `<appData>/secrets.json.age`; the vault-protected passphrase is `<appData>/secrets.key`.
- `write` and `remove` are atomic and preserve entries for other kinds.
- `write` creates the file `0600` and its directory `0700` on POSIX, so only the owner can read the stored secrets; if the directory cannot be prepared, the write fails with `write-failed`.
- `remove` on an absent kind resolves without an error.
- `read` returns null on absence or an undecryptable payload; it never throws secret material into an error.
- There is no migration. The legacy `secrets.json` is not read or converted (AGENTS.md beta rule).

## Validation contract (`apps/electron/src/main/secretKinds.ts`)

```ts
export interface SecretKindDefinition {
  storageKey: string
  validate(raw: string): ValidationResult
}

export type ValidationResult = { ok: true; value: string } | { ok: false; code: AppErrorCode }

export function validateSecret(kind: SecretKind, raw: string): ValidationResult
```

Rules and normalizations are listed in `data-model.md`.

## IPC additions (`apps/electron/src/shared/ipc-contract.ts`)

```ts
'secrets:remove': { request: { kind: SecretKind }; response: Result<{ kind: SecretKind }> }
```

- Existing channels are unchanged: `secrets:import-provider-key`, `secrets:import-s3`, `secrets:status`.
- `IPC_CHANNELS` gains `'secrets:remove'`; the contract test asserts the list.
- `AppBridge` gains `removeSecret(kind: SecretKind): Promise<Result<{ kind: SecretKind }>>`.
- A remove request whose `kind` is not a known kind is rejected with `invalid-secret`; the handler validates the literal before touching the store.

## Menu contract (`apps/electron/src/main/menu.ts`)

Two new `File` entries dispatched as `menu:command` values:

| Label | MenuCommand |
| --- | --- |
| Remove Provider API Key | `remove-provider-key` |
| Remove S3 Credentials | `remove-s3-credentials` |

## Secrecy rules

- The plaintext of any secret is produced and consumed only in main. It is never returned over IPC, written to a log, or included in an error (FR-005).
- The renderer sees only booleans (`SecretsStatus`) and typed error codes.
- The age passphrase is random per install and is held only in the OS vault via `safeStorage`; the payload is encrypted with age passphrase mode.
- The secrets files live under the app data directory, outside the conversation folder, and are never uploaded (FR-002).
- `secrets.json.age` and `secrets.key` are not committed to the repository.
