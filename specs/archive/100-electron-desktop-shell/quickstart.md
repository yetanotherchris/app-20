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

## Automated validation

```powershell
npm run lint
npm run typecheck
npm run test          # Vitest unit tests (paths, atomic write, contract shape)
npm run test:e2e      # builds Electron, then Playwright against the built app
```

The e2e suite launches the product shell through `tests/e2e/launch-shell.ts`. The existing component suite launches the demo surface through `tests/e2e/launch.ts`.

## Scenario: launch to the chat screen

1. Launch the built app with a workspace already configured.
2. A window opens; the chat screen renders with the composer.
3. Launch a second instance: the existing window is focused and no second window appears.

Expected: `chat.composer.input` is visible; `BrowserWindow.getAllWindows().length` stays 1.

## Scenario: workspace onboarding

1. Launch with no `settings.json` (empty `userData`).
2. The onboarding panel offers Choose Folder and Create Folder.
3. Choose an existing folder. The selection is remembered.

Expected: the shell shows the workspace display name; `settings.json` contains an absolute `workspacePath`; the renderer never receives that absolute path.

## Scenario: save and unsaved changes

1. Configure a workspace, send a prompt, and save (Ctrl+S or the Save menu item).
2. A JSON file appears in the workspace folder.
3. Edit again so the document is dirty, then close the window (or quit).
4. A confirmation appears with Save, Discard, and Cancel.

Expected: choosing Cancel keeps the app open and the document dirty; choosing Save writes the file then exits; a failed save keeps the window open, reports the failure, and leaves the document dirty.

## Scenario: failed save

1. Configure the workspace, create content, then make the workspace unwritable (for example, point the file name at a locked path by stubbing the write in e2e).
2. Trigger close and choose Save.

Expected: the window stays open; an error is shown; the document is still dirty; no content is discarded.

## Scenario: menu bar

Open the application menu. It contains:

- File: Import Provider API Key..., Import S3 Credentials..., Quit
- Workspace: Open Workspace Folder..., Create Workspace Folder...
- Edit/View: standard entries

Each import command opens a file chooser. A valid file reports success; a malformed file reports a clear, path-free error and stores nothing.

## Scenario: external links

Activate an `http(s)` link in assistant content.

Expected: the system browser opens the URL; the app window does not navigate. A `javascript:` or other scheme is refused.

## Manual check of isolation

In the built app, open the renderer devtools and confirm `window.require`, `window.process`, and `window.appBridge.invoke` are `undefined`; only the named `appBridge` methods exist. The document response header/meta carries the restrictive CSP from `electron.vite.config.ts`.
