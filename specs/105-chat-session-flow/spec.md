# Feature Specification: Chat Session Flow

**Feature Branch**: `105-chat-session-flow`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "The chat session flow that ties the app together: one chat screen, new chat, send and stream, save, restore on startup, and a small history list. Search and model selection are excluded from beta."

## User Scenarios & Testing

### User Story 1 - Start a new chat and get an answer (Priority: P1)

The user opens the app, types a prompt, and gets a streamed answer, end to end.

**Why this priority**: This is the complete primary loop of the product.

**Independent Test**: Launch, type, send, and receive a streamed answer on a fresh install.

**Acceptance Scenarios**:

1. **Given** a fresh install with a valid key, **When** the user sends a prompt, **Then** a streamed assistant response is displayed.
2. **Given** the first message of a chat, **When** the response completes, **Then** the conversation is saved automatically.

### User Story 2 - Resume a recent conversation (Priority: P2)

The user picks a conversation from a small history list and continues it.

**Why this priority**: A personal app accumulates conversations; resuming is the main reason to keep history.

**Independent Test**: Create two conversations, restart, and resume one; confirm its messages are present.

**Acceptance Scenarios**:

1. **Given** saved conversations, **When** the user opens the history list, **Then** recent conversations are shown with their titles and dates.
2. **Given** the user selects a conversation, **When** it opens, **Then** its messages render and it can be continued.

### User Story 3 - The conversation survives a restart (Priority: P1)

Closing and reopening the app restores the last session without loss.

**Why this priority**: Data loss is non-negotiable; the session must be durable.

**Independent Test**: Chat, close, reopen; confirm the last conversation is restored.

**Acceptance Scenarios**:

1. **Given** an active conversation, **When** the app restarts, **Then** the conversation is restored with its content.
2. **Given** unsaved changes at quit, **When** the user confirms, **Then** the changes are saved before exit.

### Edge Cases

- First run with no conversations must show a clean start.
- A failed restore must not lose the local file.
- An empty conversation must be allowed and saved.
- History must be capped; beta shows at most 5-10 conversations.

## Requirements

### Functional Requirements

- **FR-001**: The app MUST provide one chat screen.
- **FR-002**: The composer MUST send prompts and the list MUST render responses.
- **FR-003**: Completed conversations MUST be saved automatically.
- **FR-004**: The app MUST restore the last session on startup.
- **FR-005**: A history list MUST show recent conversations with title, model, and date.
- **FR-006**: The history list MUST be capped at 5-10 conversations in beta.
- **FR-007**: Beta MUST NOT include a search UI.
- **FR-008**: Beta MUST NOT include a model selection control.
- **FR-009**: A failed restore MUST NOT discard the local file.

### Key Entities

- **Session**: The currently active conversation and its state.
- **History**: The manifest-backed list of recent conversations.

## Success Criteria

### Measurable Outcomes

- **SC-001**: The full send-to-answer loop works end to end.
- **SC-002**: A conversation survives a restart without loss.
- **SC-003**: A recent conversation is resumable from the history list.
- **SC-004**: No unsaved changes are ever discarded without confirmation.

## Assumptions

- Beta history is limited to 5-10 conversations; search and model selection are excluded.
- The overview's "no chat history UI" exclusion conflicts with the minimal history list; this spec resolves that by including a capped list. Clarify with the user before planning.
- Single chat screen for beta; a left-side drawer is out of scope.