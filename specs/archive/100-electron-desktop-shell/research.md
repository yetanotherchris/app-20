# Research: Desktop App Shell

Phase 0 decisions for spec 100. Each entry states the decision, why it was chosen, and the alternatives considered.

## R1. Renderer surface selector for the component e2e harness

**Decision**: `apps/electron/src/renderer/src/main.tsx` chooses between the product shell (`App`) and the component demo (`ChatDemo`) from a `surface` URL query parameter. The main process appends the parameter when `APP20_RENDERER_SURFACE=demo` is set in the environment. `tests/e2e/launch.ts` (the existing component suite) sets that variable; `tests/e2e/launch-shell.ts` does not, so it loads the shell.

**Rationale**: The existing `tests/e2e` suite drives `@app-20/chat-demo` through the Electron host. Replacing the renderer root with the product shell would break those tests. The query parameter keeps one built app and two surfaces with a single, explicit switch, and it does not weaken the isolation boundary (the renderer still has no privileged access).

**Alternatives considered**: Move the component suite to `apps/web` and run a second Playwright config (larger change, touches the build and CI gate); test-only branches keyed on `process.env` read inside the renderer (the renderer has no `process`, and it would leak build concerns into UI code).

## R2. Workspace selection and persistence

**Decision**: The workspace root is chosen once and stored as an absolute path in `app.getPath('userData')/settings.json`. "Open" uses `dialog.showOpenDialog({ properties: ['openDirectory'] })`. "Create" uses `dialog.showSaveDialog` with a default name, then `fs.mkdir(recursive)`. On success the absolute path is persisted. The renderer receives only the workspace display name (basename) and a boolean, never the absolute path.

**Rationale**: `userData` is outside the workspace, satisfies spec 100 FR-002 and the spec 103 rule that secrets stay out of the workspace bucket, and persists across restarts on Windows. Persisting only the absolute path in main keeps the path out of renderer state.

**Alternatives considered**: Store the workspace pointer inside the workspace (cannot bootstrap a first run); store it in `localStorage` (renderer-visible and not authoritative).

## R3. Path validation in main

**Decision**: `paths.ts` exposes `resolveRealRoot(root)` (`fs.realpath`) and `assertPathWithinWorkspace(root, fileName)`. A request supplies a *file name*, not a path. The name is rejected if empty, absolute, `.`/`..`, or contains `/` or `\\`. The target is built as `resolve(realRoot, fileName)` and re-checked with `path.relative` to confirm it does not escape the root. Handlers call this before any read or write.

**Rationale**: Matches constitution II and spec 100 FR-006. Rejecting separators in the name removes the traversal vector at the source; the `relative` check is the defence-in-depth gate against symlinked roots and unusual inputs.

**Alternatives considered**: Validate the renderer-supplied path directly (renderer checks are never trusted); allow nested directories in the name (not needed in beta and needs per-segment validation).

## R4. Atomic writes

**Decision**: `atomicWriteFile(target, content)` opens a temp file in the same directory named `.<basename>.<pid>.<timestamp>.tmp`, writes UTF-8, calls `handle.sync()`, closes, then `fs.rename` over the target. If the write or rename fails, the temp file is removed and the original error is rethrown.

**Rationale**: Encodes constitution III and spec 100 FR-004. Writing in the same directory keeps the rename on one volume, so it is atomic.

**Alternatives considered**: `writeFile` directly (truncates on failure); write temp in `os.tmpdir` (rename across volumes is not atomic); configure an external atomic-write dependency (unjustified; the platform provides rename).

## R5. Settings store

**Decision**: `settings.ts` reads and writes `userData/settings.json` as JSON, using `atomicWriteFile`. A missing or unparseable file is treated as empty settings. The only key in scope is `workspacePath`.

**Rationale**: One small, durable store; reuses the atomic write path; a corrupt file must not block startup.

**Alternatives considered**: `electron-store` dependency (unjustified); a database (excluded for beta by the constitution).

## R6. Secret import at the shell level

**Decision**: The menu's import commands open a file chooser, read the file (size-capped), validate the shape, encrypt with `safeStorage.encryptString`, and store the ciphertext in `userData/secrets.json` (base64). `safeStorage.isEncryptionAvailable()` must be true; otherwise the import fails with a clear code. The store never enters the workspace and is never logged. A `secrets:status` channel reports which secrets exist.

**Rationale**: Spec 100 FR-008 requires working import menu entries; spec 103 FR-002/FR-008 require secrets to live outside the workspace and not in plaintext. `safeStorage` is the platform keychain/DPAPI wrapper Electron provides and needs no new dependency. Validation here is intentionally minimal (non-empty, no stray lines for a key; required fields for S3); richer validation and rotation UI are spec 103.

**Alternatives considered**: Defer all import to spec 103 and make the menu inert (fails spec 100 US4's independent test); store plaintext in `userData` (violates spec 103 FR-008 intent); add a keytar dependency (extra native dependency).

## R7. External link handling

**Decision**: `security.ts` sets `webContents.setWindowOpenHandler` to deny every request and call `shell.openExternal(url)` only for `http:`/`https:` URLs. A `will-navigate` guard blocks navigation away from the app origin and routes the URL through the same handler. The renderer passes `onLinkPress` to the chat component so link activation calls the `shell:open-external` channel instead of `window.open`.

**Rationale**: Spec 100 FR-011 and the constitution's isolation boundary. Deny-by-default at both the window-open and navigation layers prevents the app window from becoming a browser.

**Alternatives considered**: Rely on Electron defaults (a link would open a new `BrowserWindow`); allow only `onLinkPress` and leave window-open unguarded (misses non-component links).

## R8. Content Security Policy

**Decision**: The renderer HTML receives a CSP meta tag at build time via a `transformIndexHtml` plugin in `electron.vite.config.ts`: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`. The plugin runs only for the production build so Vite dev/HMR is unaffected.

**Rationale**: Spec 100 FR-010. `file://` documents are not covered by `webRequest.onHeadersReceived`, so the meta tag is the reliable place for the built app. `'unsafe-inline'` for styles is required by react-native-web's inline style injection; scripts stay `'self'` with no `eval`.

**Alternatives considered**: Set CSP through `onHeadersReceived` only (does not apply to the `file://` document); ship no CSP in dev and rely on the sandbox (the built app is the one under test).

## R9. Close and quit gating

**Decision**: Main intercepts `BrowserWindow` `close` and `app` `before-quit`. Unless a close has already been authorised, it calls `preventDefault()` and sends an `app:close-requested` event with the reason (`close` or `quit`). The renderer stops any in-flight stream, then either reports clean via `app:close-decision` or shows a Save / Discard / Cancel dialog. Save attempts the document write; a failure keeps the dialog open and reports a code, never closing. Cancel clears the pending request. Authorisation is a module-level flag set only by the `app:close-decision` handler.

**Rationale**: Spec 100 FR-003 and US2. Keeping document content and the save attempt in the renderer means no content crosses the IPC boundary just to close, and a failed save is observed where the dirty flag lives. Main remains the gate that blocks the window from closing.

**Alternatives considered**: Save in main on close (main does not hold the live document in beta); synchronous prompt in main (Electron blocks and the UI freezes); let the renderer close itself without a main gate (a hung renderer could lose data).

## R10. Cross-spec boundary and the provisional document

**Decision**: The shell implements the workspace, the path-safe file API, the dirty/close/quit guarantee, the menu, and the shell UI. It persists the active document as JSON in the workspace through `file:write` so spec 100's US3 file acceptance scenario is testable. The stored envelope is deliberately thin (`{ id, title, updatedAt, messages: [{ id, role, content, createdAt, status }] }`), close to spec 101's stated schema, and is owned by spec 101 to finalise. No provider call is made; the shell's transport appends a local placeholder assistant message so the chat screen is exercisable.

**Rationale**: Spec 100's user scenarios require a working chat screen, a saved JSON file in the workspace, and unsaved-change tracking. Specs 101/102/105 are not implemented, so the shell must supply a minimal stand-in. Recording it here and in the spec's Assumptions keeps the deviation visible instead of hiding it in code.

**Alternatives considered**: Implement nothing until 101/102/105 land (spec 100 cannot be demonstrated or tested); implement the full 101/102/105 stack inside this spec (scope expansion well beyond spec 100).

## R11. Error scrubbing

**Decision**: `errors.ts` defines a closed `AppErrorCode` union (`'no-workspace'`, `'invalid-name'`, `'outside-workspace'`, `'read-failed'`, `'write-failed'`, `'chooser-cancelled'`, `'invalid-secret'`, `'secret-store-unavailable'`, `'not-permitted'`, `'unknown'`). IPC handlers return discriminated results `{ ok: true, value } | { ok: false, code, message }` where `message` is a fixed, path-free string. `sanitizeErrorCode(error)` maps unexpected errors to `'unknown'`.

**Rationale**: Spec 100 FR-007 and SC-005. A closed union makes the renderer copy deterministic and a leak of an absolute path a compile-visible mistake, not a runtime accident.

**Alternatives considered**: Return `error.message` and strip paths with a regex (brittle, can miss Windows forms); log full errors to the renderer (leaks).
