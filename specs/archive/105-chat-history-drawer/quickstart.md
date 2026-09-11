# Quickstart: Chat History Drawer

Validation guide for spec 105. Run from the repository root.

## Prerequisites

- Node and dependencies installed (`npm ci`).
- A provider key and OpenRouter reachable only for the manual "continue a resumed conversation" step; the drawer's browse, resume, empty, and error paths need no network.

## Automated checks

```powershell
npm run lint
npm run typecheck
npm run test          # unit tests, including history helpers, hook, and drawer
npm run test:e2e      # builds the app, then runs tests/e2e/chat-history.spec.ts
```

Expected: all four pass. The e2e suite drives the built Electron app.

## What the e2e suite proves

| Scenario (spec)                                | Step                                                                 | Expected                                                     |
| ---------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------ |
| Browse recent conversations (US1.1, SC-002)    | Seed two conversation files and a manifest, open the drawer          | Both listed, newest first, each with title, model, and date. |
| Resume with messages and draft (US1.2, SC-001) | Select the older conversation                                        | Its messages and saved draft load; it can be continued.      |
| Close on selection or scrim (US1.3)            | Select an entry, then open and press the scrim                       | The drawer closes both ways.                                 |
| New conversation (US2, SC-005)                 | Open the drawer with a dirty conversation, activate New conversation | Composer cleared; the prior conversation is persisted.       |
| Empty history (US3.1, SC-004)                  | Launch with no conversations, open the drawer                        | Empty state, no error notification.                          |
| Untitled placeholder (US3.2, FR-005)           | Seed a conversation with a blank title, open the drawer              | The row reads `Untitled`.                                    |
| Corrupt entry (US3.3, FR-007)                  | Seed one corrupt and one valid conversation, open the drawer         | The corrupt file is reported; the valid entry is selectable. |
| Streaming not interrupted (edge case, SC-003)  | Start a held response, open then close the drawer                    | The response keeps streaming and the draft is untouched.     |

## Manual check

```powershell
npm run dev:electron
```

1. Send a message and save it, then start a second conversation and save it.
2. Open the history drawer from the top bar. Confirm two entries, newest first, with model and date.
3. Select the first conversation. Confirm its messages and any unsent draft return and the drawer closes.
4. Open the drawer and choose New conversation. Confirm the composer is empty and the earlier conversation is still on disk.
5. Open the drawer and press outside it. Confirm it closes without changing the conversation.

## Definition of done

- [ ] Browse, resume, new-conversation, empty, untitled, and corrupt-entry e2e scenarios pass.
- [ ] Opening and closing the drawer during a stream does not stop it.
- [ ] Switching saves first and leaves the session unchanged on failure.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run test:e2e` are green.
