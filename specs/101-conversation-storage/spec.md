# Feature Specification: Conversation Storage

**Feature Branch**: `101-conversation-storage`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "Conversation storage for beta: one JSON file per conversation plus a manifest, an app-owned OpenAI-compatible schema, local persistence, and no SQLite."

## User Scenarios & Testing

### User Story 1 - A conversation survives a restart (Priority: P1)

The user chats, closes the app, and reopens; the conversation is still there.

**Why this priority**: Persistence is the difference between a chat and a scratchpad.

**Independent Test**: Create a conversation, restart the app, confirm the conversation is present with its messages.

**Acceptance Scenarios**:

1. **Given** a conversation has messages, **When** the app restarts, **Then** the conversation and its messages are restored.
2. **Given** a conversation is saved, **When** it is written to disk, **Then** it is one JSON file following the app-owned schema.

### User Story 2 - Conversations are listed from a manifest (Priority: P2)

The app reads a manifest to know which conversations exist.

**Why this priority**: The manifest enables later history and search without scanning every file.

**Independent Test**: Create two conversations; confirm the manifest lists both with their metadata.

**Acceptance Scenarios**:

1. **Given** two saved conversations, **When** the manifest is read, **Then** it lists both with their metadata.
2. **Given** a new conversation is saved, **When** it is persisted, **Then** the manifest entry is created or updated.

### Edge Cases

- A corrupt conversation file must be reported, not crash the app.
- An empty conversation must still be valid to save.
- A missing manifest must be treated as an empty history, not an error.

## Requirements

### Functional Requirements

- **FR-001**: Each conversation MUST be stored as one JSON file.
- **FR-002**: A manifest MUST list conversations with GUID, filename, title, model, and date.
- **FR-003**: The conversation schema MUST be app-owned and OpenAI-compatible.
- **FR-004**: Each message MUST include `id`, `role`, string `content`, `createdAt`, and `status`.
- **FR-005**: Beta MUST support `system`, `user`, and `assistant` roles; `tool` is reserved for future tool calling.
- **FR-006**: The canonical conversation format MUST NOT include provider-specific response fields.
- **FR-007**: SQLite MUST NOT be used in beta releases.
- **FR-008**: Conversations MUST persist locally on the device.

### Key Entities

- **Conversation**: A titled, dated collection of messages with a GUID.
- **Message**: A single entry with id, role, content, createdAt, and status.
- **Manifest**: The index of conversations and their metadata.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A conversation round-trips through save and restart without loss.
- **SC-002**: The manifest lists every saved conversation.
- **SC-003**: The saved JSON matches the app-owned schema.
- **SC-004**: No provider-specific fields leak into stored conversations.

## Assumptions

- Storage is local files on the device; the schema is stable for beta.
- Overwrite semantics are acceptable in beta; conflict resolution is out of scope.
- The manifest is plain JSON and searchable in a future release.