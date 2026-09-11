# Quickstart: Chat Autosave

Validation guide for spec 107. Run from the repository root.

## Automated checks

```powershell
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

Expected: all four pass. The e2e suite builds and drives the Electron app.

## E2E coverage

| Scenario | Expected result |
| --- | --- |
| Completed, stopped, and failed exchanges | Each terminal exchange reaches storage without Save. |
| Idle draft | Text persists after two seconds and restores after restart without sending. |
| Send after draft | Stored draft clears and the user message occurs once. |
| New conversation and resume | Current conversation saves before replacement; restored conversation keeps its draft. |
| Close and quit | No dialog appears; a draft before its timer expires and a partial stream are flushed. |
| Backgrounded stream | The partial response reaches storage when the window blurs. |
| Failed autosave | An error notification appears, session content remains, and the next trigger retries successfully. |
| Chat controls and menus | No Save control, dirty state, Save entry, or save accelerator exists. |

## Manual check

```powershell
npm run dev:electron
```

1. Type a draft, wait two seconds, then quit and relaunch. Confirm the draft is present and unsent.
2. Send a message and wait for the response. Confirm it is present after relaunch without using Save.
3. Start a new conversation. Confirm the earlier conversation appears in History.
4. Close during an active response. Confirm no prompt appears and the partial response is present after relaunch.

## Definition of done

- [ ] Unit tests cover queue serialization, debounce, failures, and retry.
- [ ] Playwright covers each spec acceptance scenario against the built app.
- [ ] No manual-save control or close confirmation remains.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run test:e2e` are green.
