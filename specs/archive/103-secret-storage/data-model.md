# Data Model: Secret Storage

## Entities

### SecretKind

The identity of a stored credential. Beta has two.

| Kind id | Storage key | Label | Validator |
| --- | --- | --- | --- |
| `provider-key` | `providerKey` | Provider API key | `validateProviderKey` |
| `s3` | `s3` | S3 credentials | `validateS3Credentials` |

The kind id is the value passed over IPC. The storage key is the field name inside the decrypted age payload. Adding a kind appends a registry entry with a new storage key and validator; existing entries are untouched (FR-006).

### SecretsFile

Two files under `<appData>`:

- `secrets.json.age`: the ASCII-armored age encryption (passphrase mode: scrypt KDF, ChaCha20-Poly1305) of the JSON object below.
- `secrets.key`: the random 256-bit age passphrase, encrypted with `safeStorage` and base64-encoded.

Decrypted payload:

```jsonc
{
  "providerKey": "sk-or-...",
  "s3": "{\"accessKeyId\":\"...\",\"secretAccessKey\":\"...\"}"
}
```

- Every value is a string. A non-string or empty value is ignored on read.
- Unknown keys are preserved on write so a build with extra kinds does not lose them when an older-kind write happens.
- Both files are written atomically (temp file in the same directory, then rename). On POSIX both are created `0600` and their directory is narrowed to `0700`, so only the owner can read them. The directory is narrowed on each write, which also fixes a directory an earlier build created at the default umask.
- A missing `secrets.json.age` reads as empty. A payload the passphrase cannot decrypt or parse also reads as empty; the next import replaces it. A missing `secrets.key` causes a new passphrase to be generated on the next write.
- No migration: the legacy `<appData>/secrets.json` is neither read nor converted (research.md R2, AGENTS.md beta rule).

### SecretStore

The node-only store bound to a file path and a cipher.

| Operation | Input | Output | Notes |
| --- | --- | --- | --- |
| `status()` | none | `{ providerKey: boolean, s3: boolean }` | true when the kind's entry is present |
| `read(kind)` | kind id | `string \| null` | plaintext from the decrypted payload; null when absent |
| `write(kind, plaintext)` | kind id, plaintext | void | decrypts the payload, sets the storage key, re-encrypts, atomic write |
| `remove(kind)` | kind id | void | deletes the storage key and rewrites; absent is a no-op |

`getProviderKey()` is `store.read('provider-key')` and is the only path that returns secret material; it is called from main only.

### ValidationResult

`{ ok: true, value: string }` (the normalized string to store) or `{ ok: false, code: AppErrorCode }`.

| Kind | Accepts | Normalizes to | Rejects with |
| --- | --- | --- | --- |
| `provider-key` | one non-empty token, no internal whitespace, ≤ 8192 chars | trimmed token | `invalid-secret`; `multiple-secrets` when another kind's JSON fields are present |
| `s3` | JSON object with non-empty string `accessKeyId` and `secretAccessKey` | canonical JSON of those two fields | `invalid-secret`; `multiple-secrets` when another kind's JSON fields are present |

Cross-kind detection: for a file that parses as a JSON object, the set of known kind markers is computed from its own keys. A marker for a kind other than the one being imported produces `multiple-secrets`; a JSON object with no other-kind marker but no valid shape for the requested kind produces `invalid-secret`.

### Errors

| Code | Message | Where |
| --- | --- | --- |
| `chooser-cancelled` | No folder was chosen. | import only; not shown as an error |
| `invalid-secret` | That file is not a valid credential file. | import |
| `multiple-secrets` | That file contains more than one kind of secret. Import one secret per file. | import |
| `secret-store-unavailable` | Secure storage is not available on this device. | import/read when the vault is unavailable |
| `read-failed` | The file could not be read. | read/import/remove when the passphrase or payload cannot be read |
| `write-failed` | The file could not be saved. | import/remove when encryption or the atomic write fails |

Errors carry a code and a fixed message; no secret value, path, or raw parser message is included (FR-005).

## State transitions

- **Absent to present**: import validates, encrypts the envelope, sets the storage key (FR-001, FR-003).
- **Present to present (new value)**: import overwrites the same storage key, leaving other kinds intact (FR-004).
- **Present to absent**: remove deletes the storage key (FR-007).
- **Absent to absent**: remove succeeds without writing (idempotent).

Dependent behavior after a transition: the provider path reads `read('provider-key')` per request, so the next request uses the new key (SC-001) or fails with `missing-key` after removal (SC-005). S3 sync reads its credential per job, so it stops authenticating until re-import.
