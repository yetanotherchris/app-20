# Contract: Secret Store and IPC

Spec 103 lives in the Electron main process and is reached from the renderer only through the fixed preload API (constitution IV). This document fixes the internal store contract, the renderer-visible IPC additions, and the secrecy rules.

## Internal store contract (`apps/electron/src/main/secretStore.ts`)

```ts
export interface SecretCipher {
  /** Encrypt plaintext to a storable string, or throw when encryption is unavailable. */
  encrypt(plaintext: string): string
  /** Decrypt a stored value, or return null when it cannot be decrypted. */
  decrypt(stored: string): string | null
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

- `write` and `remove` are atomic and preserve entries for other kinds.
- `remove` on an absent kind resolves without an error.
- `read` returns null on absence or decrypt failure; it never throws secret material into an error.

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
- The secret file lives under the app data directory, outside the conversation folder, and is never uploaded (FR-002).
- `secrets.json` is not committed to the repository.
