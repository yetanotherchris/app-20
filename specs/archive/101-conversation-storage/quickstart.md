# Quickstart: Conversation Storage

Validation guide for spec 101. Commands run from the repository root.

## Prerequisites

- Node.js and npm; run `npm install` after adding the `@app-20/conversation-storage` workspace so npm links it into `node_modules`.
- Windows desktop (beta target) for the e2e suite.

## Automated validation

```powershell
npm run lint
npm run typecheck
npm run test          # Vitest: package unit tests + Electron integration
npm run build:electron
npm run test:e2e      # builds Electron, then Playwright against the built app
npm run verify        # all of the above in order
```

The spec 101 scenarios live in `tests/e2e/conversation-storage.spec.ts`. The package unit tests cover the schema, manifest, filenames, and store; the Electron integration test covers the filesystem port and reconciliation.

## Scenario: one file per conversation plus a manifest

1. Launch the built app (`npm run dev:electron` or the e2e launcher).
2. Send a prompt, then save.
3. Inspect the conversation folder (`APP20_CONVERSATION_DIR` when set for a run).

Expected: one `<id>.json` file whose content matches the schema in `data-model.md` (every message has `id`, `role`, string `content`, `createdAt`, and a terminal `status`), and one `manifest.json` listing the conversation with `id`, `fileName`, `title`, `model`, and `updatedAt`.

## Scenario: a conversation survives a restart

1. Save a conversation, then quit and relaunch against the same conversation folder.

Expected: the conversation and its messages are restored from the manifest entry; the composer draft is restored when one was saved.

## Scenario: the manifest lists every conversation

1. Save one conversation, start a new one, save again.

Expected: `manifest.json` lists both, and `conversations:list` returns both sorted newest first.

## Scenario: recovery edge cases

Seed the conversation folder before launch, then observe startup:

1. **Corrupt file**: write `conversation-broken.json` containing invalid JSON. Expected: the app starts, reports a corrupt file once, and leaves the file on disk.
2. **Missing manifest**: leave only conversation files. Expected: the manifest is rebuilt from them at startup (repaired count) and no error is shown.
3. **Missing file for an entry**: put an entry in `manifest.json` for a file that does not exist. Expected: the entry is dropped and the app starts normally.
4. **Orphan with a colliding name**: create a file named exactly like a new conversation's `<id>.json` but absent from the manifest. Expected: the new conversation is saved under a suffixed name and the orphan is left untouched.

Units for cases 2 and 4 live in `packages/conversation-storage/src/store.test.ts` and `filename.test.ts`; case 3 and the corrupt-file report are exercised in `tests/e2e/conversation-storage.spec.ts`.

## Manual check: no provider fields, no SQLite

1. Save a conversation and open its JSON.

Expected: no provider response object, no `usage`, `choices`, or vendor fields; the schema is the app-owned one. There is no database file in the conversation folder or the app config directory.
