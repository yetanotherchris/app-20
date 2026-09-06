# Feature Specification: Chat Session Flow

**Feature Branch**: `105-chat-session-flow`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "The chat session flow that ties the app together: one chat screen, new chat, send and stream, save, restore on startup, and a small history list. Search and model selection are excluded from beta."

## User Scenarios & Testing

### User Story 1 - Start a new chat and get an answer (Priority: P1)

The user opens the app, starts a new conversation, types a prompt, and gets a streamed answer, end to end.

**Why this priority**: This is the complete primary loop of the product.

**Independent Test**: Launch, start a new chat, type, send, and receive a streamed answer on a fresh install.

**Acceptance Scenarios**:

1. **Given** a fresh install with a valid key, **When** the user starts a new conversation and sends a prompt, **Then** a streamed assistant response is displayed.
2. **Given** an exchange reaches a terminal state (complete, stopped, or error), **When** the app saves, **Then** the conversation is persisted automatically.
3. **Given** no stored API key on first run, **When** the user reaches first send, **Then** the key import flow (spec 103) is presented before or at the send.

### User Story 2 - Resume a recent conversation (Priority: P2)

The user picks a conversation from a small history list and continues it.

**Why this priority**: A personal app accumulates conversations; resuming is the main reason to keep history.

**Independent Test**: Create two conversations, restart, and resume one; confirm its messages are present.

**Acceptance Scenarios**:

1. **Given** saved conversations, **When** the user opens the history list, **Then** recent conversations are shown with their titles, models, and dates, at most 10 entries.
2. **Given** the user selects a conversation, **When** it opens, **Then** its messages render and it can be continued.
3. **Given** a conversation with no user prompt yet, **When** it is listed, **Then** it shows an untitled placeholder.

### User Story 3 - The conversation survives a restart (Priority: P1)

Closing and reopening the app restores the last session without loss.

**Why this priority**: Data loss is non-negotiable; the session must be durable.

**Independent Test**: Chat, close, reopen; confirm the last conversation is restored.

**Acceptance Scenarios**:

1. **Given** an active conversation, **When** the app restarts, **Then** the conversation is restored with its content.
2. **Given** unsaved changes at quit, **When** the user confirms, **Then** the changes are saved before exit.
3. **Given** a response was streaming when the app was backgrounded or terminated, **When** the app restarts, **Then** the partial content is present, saved per FR-003.

### Edge Cases

- First run with no conversations must show a clean start.
- A failed restore must not lose the local file.
- An empty conversation must be allowed and saved.
- Startup sync (spec 104) must settle before session restore; restore must never revert locally newer content.

## Requirements

### Functional Requirements

- **FR-001**: The app MUST provide one chat screen.
- **FR-002**: The composer MUST send prompts and the list MUST render responses.
- **FR-003**: Conversations MUST be saved automatically when an exchange reaches a terminal state (complete, stopped, or error), and when the app is backgrounded or terminated, whichever comes first.
- **FR-004**: The app MUST restore the last session on startup, after startup sync settles, and MUST NOT revert locally newer content.
- **FR-005**: A history list MUST show recent conversations with title, model, and date, displaying at most 10 entries in beta. Storage itself is not limited by this cap (see spec 101).
- **FR-006**: The app MUST provide an explicit action to start a new conversation from the chat screen.
- **FR-007**: A conversation's title MUST be derived from its first user prompt; before that it renders as an untitled placeholder.
- **FR-008**: On first run with no stored API key, the app MUST present the key import flow (spec 103) before or at first send.
- **FR-009**: A failed restore MUST NOT discard the local file.
- **FR-010**: Beta MUST NOT include accounts, login, or authentication flows.
- **FR-011**: Beta MUST NOT include file uploads or vectorization.
- **FR-012**: Beta MUST NOT include a search UI or a model selection control.

### Key Entities

- **Session**: The currently active conversation and its state.
- **History**: The manifest-backed list of recent conversations.

## Success Criteria

### Measurable Outcomes

- **SC-001**: The full send-to-answer loop works end to end.
- **SC-002**: A conversation survives a restart without loss.
- **SC-003**: A recent conversation is resumable from the history list.
- **SC-004**: No unsaved changes are ever discarded without confirmation (close and quit prompts are owned by spec 100).

## Assumptions

- The history list displays at most 10 recent conversations in beta (the docs target is 5-10); storage is unlimited.
- docs/overview.md's beta exclusion is reworded to "no search UI"; the capped history list is included per that document's Conversation Storage section.
- Single chat screen for beta; a left-side drawer is out of scope.
- Close and quit confirmation is owned by spec 100; this spec references it.