# Research: Chat Autosave

Phase 0 decisions for spec 107.

## R1: Serialize saves in the renderer

**Decision**: A renderer-side autosave queue serializes `conversations:save` calls and builds each conversation snapshot immediately before its write. A revision requested during an active write causes one subsequent write with the latest messages and draft.

**Rationale**: The application is single-instance, while rapid typing and streaming can request saves faster than the filesystem finishes them. Serial writes prevent an older snapshot from overwriting a newer one. Building snapshots from live refs avoids saving React state from before a chat update has rendered.

**Alternatives considered**: Start every save independently (rejected: completion order can overwrite a new draft with an older one). Add a main-process queue (rejected: the renderer alone owns the session snapshot and one typed save operation already performs the atomic conversation and manifest writes).

## R2: Drafts debounce for two seconds; terminal and departure events flush

**Decision**: Draft edits reset a 2,000 ms timer. Terminal exchange, background, conversation switch, new conversation, and close or quit cancel that timer and flush the latest session snapshot.

**Rationale**: This implements the specified idle interval while ensuring a pending draft and partial response are persisted before the session can be replaced or the renderer destroyed.

**Alternatives considered**: Save on every keystroke (rejected: unnecessary filesystem writes). Save only on the timer (rejected: a close before the timer expires would lose the draft).

## R3: Retain the close handshake without a confirmation UI

**Decision**: Main still prevents the native close once and sends the fixed `app:close-requested` event. The renderer stops an active request, attempts one final flush, then sends the close decision whether that flush succeeds or fails. No prompt is rendered.

**Rationale**: Electron needs an asynchronous boundary to allow the renderer to persist before destruction. The handshake provides it without exposing a save, discard, or cancel decision to the user. A failed close-time save is not reported because the session is ending, as accepted in the specification.

**Alternatives considered**: Let Electron close immediately (rejected: cannot await a final draft or partial-response save). Keep the confirmation dialog (rejected: contradicts FR-005).

## R4: Backgrounding is a typed main-to-renderer event

**Decision**: The main window emits `app:backgrounded` on `blur`; preload exposes `onAppBackgrounded`; the session flushes on receipt.

**Rationale**: The renderer has no Electron access and a window blur is the Electron lifecycle point that represents an active response leaving the foreground. The named event preserves the fixed, typed preload API.

**Alternatives considered**: Use renderer visibility APIs alone (rejected: they do not represent every desktop blur). Add a generic lifecycle subscription (rejected: violates the fixed API constraint).

## R5: Failed saves are reported once and retried by the next trigger

**Decision**: An unsuccessful autosave retains the latest session revision, reports a path-free error notification once while the session remains open, and does not retry until a later autosave trigger. A successful later save clears the reported failure state.

**Rationale**: The user retains their words and learns persistence failed without an unbounded retry loop or repeated notifications. A subsequent terminal exchange or draft pause retries the retained latest snapshot.

**Alternatives considered**: Retry continuously (rejected: can consume resources and flood notifications for a persistent filesystem failure). Drop the failed change (rejected: violates Principle III and FR-009).

## R6: Remove editor-only controls and manual-save state

**Decision**: Remove the Save menu command and accelerator, top-bar Save control, dirty/saving indicator, close guard, and confirmation dialog. Session transitions await an internal flush rather than exposing a manual `save()` method.

**Rationale**: They model a document editor rather than the required chat-client behavior. Autosave owns persistence timing; error notifications remain the user-facing recovery signal.

**Alternatives considered**: Keep Save as an optional shortcut (rejected: FR-006 explicitly forbids it). Keep a saved badge (rejected: FR-007 forbids an unsaved-changes indicator and it introduces an editor-state concept the chat does not need).
