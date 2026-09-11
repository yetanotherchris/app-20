# Feature Specification: Chat Autosave

**Feature Branch**: `107-chat-autosave`

**Created**: 2026-09-10

**Status**: Draft

**Input**: User description: "Chat conversations should persist automatically, like every chat client: no Save button, no unsaved-changes indicator, and no save/discard prompt when closing or quitting. Typing in the composer should also persist on a timer, without sending. This corrects the editor-derived save and close-confirmation behavior inherited from the markdown editor template used to seed specs 100 and 105."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Conversations persist without a save action (Priority: P1)

The user chats normally and never has to save; every exchange is stored on its own.

**Why this priority**: Autosave is the defining behavior of a chat client and the fix for the manual-save model that leaked in from the editor template.

**Independent Test**: Send a prompt, let the response finish, and confirm the conversation is persisted with no save action taken.

**Acceptance Scenarios**:

1. **Given** the user sends a prompt, **When** the exchange reaches a terminal state, **Then** the conversation is persisted without the user doing anything.
2. **Given** the user starts a new conversation, **When** it begins, **Then** the previous conversation is already persisted and is not saved as part of starting the new one.
3. **Given** the app is restarted, **When** it opens, **Then** the last conversation is restored.

### User Story 2 - A typed draft survives without sending (Priority: P1)

The user types a message and does not send it; the text is still there later.

**Why this priority**: Losing an unsent draft is the most likely way a chat user loses words, and it is the case that currently triggers the exit prompt.

**Independent Test**: Type into the composer, wait two seconds, restart the app, and confirm the draft is restored without the message having been sent.

**Acceptance Scenarios**:

1. **Given** the user is typing an unsent message, **When** two seconds pass with no further keystroke, **Then** the draft is persisted without sending and without any save action.
2. **Given** the user typed a draft and quit, **When** they reopen the app, **Then** the draft is restored in the composer.
3. **Given** the user typed a draft and then sent it, **When** the conversation is persisted, **Then** the draft is cleared and the sent message is stored once.

### User Story 3 - Quitting never asks to save (Priority: P1)

The user closes the window or quits the app and it just exits.

**Why this priority**: This is the behavior the user reported as wrong. A text editor asks before discarding an unsaved buffer; a chat client does not.

**Independent Test**: With a conversation in progress, close and quit; confirm no dialog appears. (This relies on the P1 autosave in US1 and US2 to keep the content; it tests the no-prompt behavior specifically.)

**Acceptance Scenarios**:

1. **Given** a conversation in progress, **When** the user closes the window, **Then** no save/discard/cancel question is shown and the app closes.
2. **Given** a conversation in progress, **When** the user quits, **Then** the conversation and draft are persisted and the app exits.
3. **Given** an assistant response is still streaming, **When** the user quits, **Then** the partial response is persisted and the app exits.
4. **Given** the user typed a draft and quit before the two-second pause elapsed, **When** the app quits, **Then** the pending draft is persisted before exit.

### User Story 4 - No save controls on the chat screen (Priority: P2)

The chat screen looks like a chat client, not an editor.

**Why this priority**: A Save button, a Save menu item, a keyboard shortcut, and a "Saved / Unsaved changes" badge are editor affordances that should not exist once saving is automatic.

**Independent Test**: Inspect the chat screen and menus; confirm no save control or dirty/clean indicator is present. No other story is required for this to be verified.

**Acceptance Scenarios**:

1. **Given** the app is open, **When** the user looks at the chat screen, **Then** there is no Save control and no unsaved-changes indicator.
2. **Given** the app is open, **When** the user opens the menus, **Then** there is no Save entry and no save keyboard shortcut.

### User Story 5 - A failed autosave is visible and recoverable (Priority: P2)

If persistence fails, the user finds out and their words are not silently lost.

**Why this priority**: Autosave removes the user's manual safety net, so the system must carry the no-data-loss guarantee instead.

**Independent Test**: Force a save failure and confirm the user is told, the conversation content remains in the session, and the save is retried on the next autosave trigger.

**Acceptance Scenarios**:

1. **Given** an autosave fails, **When** the user is still in the app, **Then** the failure is reported and the content remains in the session.
2. **Given** an autosave failed, **When** the next autosave trigger occurs and succeeds, **Then** the conversation is persisted and the failure is cleared.

### Edge Cases

- A response is mid-stream when the app is backgrounded or closed; the partial content is persisted.
- The user quits while a typing-pause save is still pending; the pending change is flushed before exit.
- A save fails at the moment of quitting: the app exits without any prompt; whatever autosave already persisted is retained, and the failure is not shown that session.
- A new, empty conversation exists; it is valid to persist.
- Two autosaves overlap or arrive close together, including rapid typing; the latest content wins and no save corrupts an earlier one.
- The same conversation is opened and resumed; autosave does not create a duplicate conversation or a duplicate history entry.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Conversations MUST persist automatically when an exchange reaches a terminal state (`complete`, `stopped`, or `error`), with no user action.
- **FR-002**: The composer draft MUST persist automatically within two seconds of the user's last keystroke, without sending the message and without any save action.
- **FR-003**: The active conversation and its draft MUST persist when the app is closed or quit.
- **FR-004**: A partial assistant response in flight MUST persist when the app is backgrounded or closed.
- **FR-005**: Closing or quitting MUST NOT present a save/discard/cancel question, including when the most recent save failed.
- **FR-006**: The chat screen MUST NOT offer a manual save control, and the application menus MUST NOT offer a Save action or save keyboard shortcut.
- **FR-007**: The chat screen MUST NOT display an unsaved-changes indicator.
- **FR-008**: Starting a new conversation MUST NOT require saving the current one first; the current one is already persisted.
- **FR-009**: While the app is open, a failed save MUST be reported to the user, MUST retain the conversation content in the session, and MUST be retried on the next autosave trigger (FR-001 or FR-002); content MUST NOT be silently discarded. At close or quit the app MUST exit without any prompt, after a final attempt to persist.

### Key Entities

- **Conversation**: The persisted chat and its messages, defined by spec 101 (archived, `specs/archive/101-conversation-storage`).
- **Session**: The active conversation currently shown in the app, including its unsent draft.
- **Autosave**: The automatic persistence of the session, triggered by a terminal exchange, a pause in typing, or leaving the app.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: After a response completes, 100% of conversations are persisted without any user save action.
- **SC-002**: Within two seconds of the user's last keystroke, the draft is persisted before the user sends or quits; restarting the app restores it.
- **SC-003**: Quitting or closing shows zero save prompts in the acceptance suite.
- **SC-004**: The chat screen and menus contain zero save controls and zero unsaved-changes indicators.
- **SC-005**: A forced save failure is reported to the user and the conversation content is still present in the session afterward.
- **SC-006**: After a restart, the last conversation and its draft are restored.

## Assumptions

- Chat clients such as ChatGPT and Claude are the behavioral model: they autosave after a short idle period, expose no save controls, and close without asking.
- This supersedes the editor-derived requirements it was seeded with:
  - spec 100 (archived): FR-003, FR-004's "failed save MUST leave the document dirty" clause, US2, the edge case "Closing with a failed save must leave the document dirty", and SC-004.
  - spec 105: the save, close-confirmation, and startup-restore requirements seeded into 105 are now owned here. Spec 105 was rewritten as the chat history drawer and no longer restates them.
  - It does not supersede spec 100 SC-002's "does not discard content", which this feature preserves.
- The constitution was amended in this change (MAJOR, 1.0.0 to 2.0.0): Principle III now requires autosave with a reported, retried failed save instead of a dirty document and a confirmation prompt, and Principle V requires autosave tests instead of the close/quit confirmation test class. The spec's dependency on that amendment is therefore resolved.
- No save prompt is shown under any circumstance, including a failed save at quit. Because autosave already runs on every terminal exchange and typing pause, a failure at quit risks at most the last in-flight change; that is accepted, and the trade-off is recorded here rather than hidden.
- The conversation schema and the way conversations are stored and laid out on disk are owned by spec 101 (archived) and by the plan for this feature. This specification changes when persistence happens, not the schema or the storage layout.
- Cloud sync and its conflict handling are owned by spec 104; this feature only covers local persistence.
- Renaming the residual "workspace" identifiers to "conversation folder" is tidy-up and is out of scope here.
