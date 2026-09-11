# Quickstart: Secret Storage

Validation guide for spec 103. It proves the acceptance scenarios against the built app. Implementation detail lives in `tasks.md`.

## Prerequisites

- `npm install` has run at the repository root.
- The Electron app builds: `npm run build:electron`.

## Automated checks

Run the unit tests for the age cipher, the store, the validators, and the paths:

```text
npm run test -- apps/electron/src/main/ageCipher.test.ts apps/electron/src/main/secretStore.test.ts apps/electron/src/main/secretKinds.test.ts apps/electron/src/main/appData.test.ts
```

Expected: the age round-trip produces an armored file with no plaintext and rejects a wrong passphrase; status/read/write/remove/idempotent-remove/unknown-key-preservation pass for the store; provider-key and S3 acceptance and rejection cases pass for the validators, including `multiple-secrets`; `secrets.json.age` and `secrets.key` are the configured paths.

Run the full suites the PR gate runs:

```text
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

Expected: all green. The e2e run builds Electron and launches it under Playwright.

## End-to-end scenarios (`tests/e2e/secret-storage.spec.ts`)

The suite launches the app with a temp data directory, points the provider at a local fake OpenRouter server, and drives the menu with stubbed native dialogs. It also reads `<dataDir>/secrets.json.age` to prove the stored ciphertext is armored, contains no plaintext, and changes on overwrite.

1. **US1 import and use**: import `sk-or-key-one` from a file, assert the status shows the provider key present, assert the armored file has no plaintext and no secrets file sits under the conversation folder, send a prompt, and assert the fake server received an `Authorization` header carrying the key and the reply rendered.
2. **US1 overwrite (SC-002)**: import a second key, send another prompt, and assert the latest request used the second key.
3. **US1 reject**: import a malformed key file, assert the error notification names the credential-file message and the status stays unchanged.
4. **US1 multi-secret reject**: import a JSON file containing both a provider key field and S3 fields, assert the `multiple-secrets` message and that nothing is stored.
5. **US2 import S3**: import a valid credentials file and assert the S3 status is present.
6. **US2 reject S3**: import `{"accessKeyId": 5}`, assert the error and that the S3 status is unchanged.
7. **US3 remove provider key (SC-005)**: remove the stored provider key, assert the status clears, send a prompt, and assert the missing-key message appears and no request reaches the server.
8. **US3 remove S3**: remove the stored S3 credentials and assert the S3 status clears.

## Manual check

1. Launch the app (`npm run dev:electron`).
2. File, Import Provider API Key, choose a file containing one key. Confirm the success notification.
3. Send a prompt. Confirm a response arrives.
4. File, Remove Provider API Key. Send a prompt. Confirm the missing-key message.
