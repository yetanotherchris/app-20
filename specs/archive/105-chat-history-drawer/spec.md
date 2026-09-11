# Feature Specification: Chat History Drawer

**Feature Branch**: `105-chat-history-drawer`

**Created**: 2026-09-07

**Status**: Archived

**Input**: User description: "A history drawer on the left of the chat screen: a toggled overlay listing recent conversations with title, model, and date, resuming one on selection, and starting a new conversation from the top of the drawer. Restore on startup and autosave are owned by spec 107."

## User Scenarios & Testing

### User Story 1 - Browse and resume a recent conversation (Priority: P1)

The user opens the history drawer, sees their recent conversations, and picks one to continue.

**Why this priority**: A personal app accumulates conversations; resuming one from a list is the reason history exists.

**Independent Test**: Create two conversations, open the drawer, select the older one; confirm its messages are present and it can be continued.

**Acceptance Scenarios**:

1. **Given** the chat screen is shown, **When** the user opens the history drawer, **Then** recent conversations are listed with title, model, and date, most recent first, at most 10 entries.
2. **Given** the drawer is open, **When** the user selects a conversation, **Then** it opens with its messages and its saved draft, and it can be continued.
3. **Given** the drawer is open, **When** the user selects a conversation or activates the scrim outside it, **Then** the drawer closes.

### User Story 2 - Start a new conversation from the drawer (Priority: P1)

The user starts a new conversation from the top of the drawer.

**Why this priority**: Starting fresh is a common action and belongs next to the history list.

**Independent Test**: Open the drawer, activate New conversation; confirm the composer is empty and the new conversation is active.

**Acceptance Scenarios**:

1. **Given** the drawer is open, **When** the user activates New conversation, **Then** the composer is cleared and a new empty conversation is active.
2. **Given** the current conversation has content, **When** the user starts a new one, **Then** the current conversation is already persisted and is not lost.

### User Story 3 - Handle empty, untitled, and unreadable entries (Priority: P2)

The drawer stays usable when there is nothing to show or an entry cannot be read.

**Why this priority**: An empty first run and a corrupt file are both normal conditions the drawer must survive.

**Independent Test**: Launch with no conversations and confirm an empty state; corrupt one file and confirm the remaining entries still work.

**Acceptance Scenarios**:

1. **Given** no saved conversations, **When** the drawer opens, **Then** it shows an empty state, not an error.
2. **Given** a conversation with no user prompt, **When** it is listed, **Then** it shows an untitled placeholder.
3. **Given** a corrupt or unreadable entry, **When** the drawer opens, **Then** the failure is reported and the other entries remain selectable.

### Edge Cases

- Opening or closing the drawer while a response is streaming must not stop the response.
- Selecting the conversation that is already open must close the drawer without reloading it or discarding the current draft.
- The drawer must be designed to open but is not required to render on first run before the conversation list finishes loading.
- A conversation removed on disk after the list was read must not crash the drawer when selected; it is reported per spec 101.

## Requirements

### Functional Requirements

- **FR-001**: The chat screen MUST provide a history drawer that opens from the left as a toggled overlay and closes when a conversation is selected or the scrim outside it is activated.
- **FR-002**: The drawer MUST list recent conversations from the manifest (spec 101, archived) with title, model, and date, most recent first, capped at 10 entries. Storage is not limited by this cap (spec 101).
- **FR-003**: Selecting an entry MUST open that conversation with its messages and its saved draft, and MUST allow it to be continued.
- **FR-004**: The drawer MUST provide an action to start a new conversation. Starting a new conversation MUST NOT require a save action and MUST NOT lose the current conversation (autosave is owned by spec 107).
- **FR-005**: A conversation with an empty title MUST render as an untitled placeholder.
- **FR-006**: An empty history MUST render an empty state, not an error.
- **FR-007**: A corrupt or unreadable entry MUST be reported and MUST NOT crash the drawer or block the other entries (spec 101).
- **FR-008**: Opening or closing the drawer MUST NOT interrupt an in-flight response or discard an unsent draft.
- **FR-009**: The drawer MUST be usable on desktop and iOS through the shared chat component (spec 106).
- **FR-010**: Beta MUST NOT include a search field in the drawer.
- **FR-011**: Restore of the last session on startup and autosave are owned by spec 107. This spec covers listing, selecting, and starting a new conversation.

### Key Entities

- **History Drawer**: The toggled overlay on the left of the chat screen that lists recent conversations.
- **History Entry**: A manifest entry shown in the drawer, with id, title, model, and date (spec 101).
- **Session**: The active conversation, including its unsent draft. Persistence is owned by spec 107.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A recent conversation is resumable from the drawer with its messages and draft.
- **SC-002**: The drawer shows title, model, and date for up to 10 recent conversations, most recent first.
- **SC-003**: Opening and closing the drawer never stops an in-flight response and never discards an unsent draft.
- **SC-004**: An empty history shows an empty state with no error.
- **SC-005**: Starting a new conversation from the drawer never loses the previous one.

## Assumptions

- The drawer is a toggled overlay with a scrim; it is not a persistent sidebar. A persistent desktop sidebar is future work.
- The list is capped at 10 entries in beta per docs/overview.md; storage is uncapped (spec 101).
- Title, model, and date come from the manifest (spec 101). Titling a conversation from its first user prompt is existing behavior; an empty title renders as the untitled placeholder.
- Restore of the last session on startup and autosave are owned by spec 107; this spec references them rather than restating them.
- The provider-key gate at first send is out of scope here and is specified in spec 108.
- Search in the drawer is out of scope for beta.
- This spec replaces the former 105 chat-session-flow scope. Its save, close-confirmation, restore, and key-gate requirements are now owned by specs 107 and 108, and its single-chat-screen and new-conversation behavior is already delivered by spec 100 (archived) and the shared component.
- docs/overview.md's "No left-side drawer menu" exclusion is reworded to permit the history drawer.
