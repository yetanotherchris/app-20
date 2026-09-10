# Quickstart: Desktop App Shell

Validation guide for spec 100. Commands run from the repository root.

## Prerequisites

- Node.js and npm (workspaces already installed: `npm install` if needed)
- Windows desktop (beta target)

## Build and run

```powershell
npm run build:electron   # builds main, preload, renderer into apps/electron/out
npm run dev:electron     # development run with HMR
```

The built entry point is `apps/electron/out/main/index.js`. The Playwright suite launches it with `_electron.launch`.

The app stores conversations in `<userData>/conversations` (the app config directory: `%APPDATA%\app-20\conversations` on Windows, `~/.config/app-20/conversations` on Linux) and creates it on first launch. `APP20_CONVERSATION_DIR` overrides the location, which the e2e suite uses to keep test data out of the real config directory.

## Automated validation

```powershell
npm run lint
npm run typecheck
npm run test          # Vitest unit tests (paths, atomic write, contract shape)
npm run build:electron
npm run dev:smoke     # serve-mode resolution check (catches the app-20-llmchat dev condition)
npm run test:e2e      # builds Electron, then Playwright against the built app
npm run verify        # all of the above in order
```

`dev:smoke` exists because the production build resolves dependencies with the `default` export condition while the dev server uses `development`, which `app-20-llmchat` points at an unpublished file.

The e2e suite in `tests/e2e/shell.spec.ts` launches the shell through `tests/e2e/launch-shell.ts`. The shared component's own tests live in its separate repository (`app-20-llmchat`); the in-repo component harness and its e2e were retired (research R16).

## Scenario: launch to the chat screen

1. Launch the built app. A window opens; the chat screen renders with the composer.
2. Launch a second instance: the existing window is focused and no second window appears.

Expected: `chat.composer.input` is visible; `BrowserWindow.getAllWindows().length` stays 1.

## Scenario: conversations folder

1. Launch the app. It creates `<userData>/conversations` without prompting.
2. Choose Conversations > Show Conversations Folder.

Expected: the shell shows the folder display name and never the absolute path; the OS file manager opens the folder.

## Scenario: save and unsaved changes

1. Send a prompt, then save (Ctrl+S or File > Save).
2. A JSON file appears in the conversations folder.
3. Edit again so the document is dirty, then close the window (or quit).
4. A confirmation appears with Save, Discard, and Cancel.

Expected: choosing Cancel keeps the app open and the document dirty; choosing Save writes the file then exits; a failed save keeps the window open, reports the failure, and leaves the document dirty.

## Scenario: failed save

1. Create content, then make the conversations folder unreadable (for example, delete it in e2e).
2. Trigger close and choose Save.

Expected: the window stays open; an error is shown; the document is still dirty; no content is discarded.

## Scenario: menu bar

Open the application menu. It contains:

- File: Import Provider API Key..., Import S3 Credentials..., Save, Quit
- Conversations: Show Conversations Folder, New Conversation
- Edit/View: standard entries

Each import command opens a file chooser. A valid file reports success; a malformed file reports a clear, path-free error and stores nothing.

## Scenario: external links

Activate an `http(s)` link in assistant content.

Expected: the system browser opens the URL; the app window does not navigate. A `javascript:` or other scheme is refused.

## Manual check of isolation

In the built app, open the renderer devtools and confirm `window.require`, `window.process`, and `window.appBridge.invoke` are `undefined`; only the named `appBridge` methods exist. The document response header/meta carries the restrictive CSP from `electron.vite.config.ts`.
