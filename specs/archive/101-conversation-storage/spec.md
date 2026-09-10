# Feature Specification: Conversation Storage

**Feature Branch**: `101-conversation-storage`

**Created**: 2026-09-07

**Status**: Archived

**Input**: User description: "Conversation storage for beta: one JSON file per conversation plus a manifest, an app-owned OpenAI-compatible schema, local persistence, and no SQLite."

## Clarifications

### Session 2026-09-10

- The conversation envelope carries an optional `draft` string so an unsent composer draft survives restart. This retains the user-visible behavior spec 100 delivered provisionally; it is not an OpenAI message field and is never sent to a provider.
- The manifest `model` value is recorded from the requested model. Until spec 102 supplies one it may be empty; the storage layer records whatever model string it is given rather than inventing one.

## User Scenarios & Testing

### User Story 1 - A conversation survives a restart (Priority: P1)

The user chats, closes the app, and reopens; the conversation is still there.

**Why this priority**: Persistence is the difference between a chat and a scratchpad.

**Independent Test**: Create a conversation, restart the app, confirm the conversation is present with its messages.

**Acceptance Scenarios**:

1. **Given** a conversation has messages, **When** the app restarts, **Then** the conversation and its messages are restored.
2. **Given** a conversation is saved, **When** it is written to disk, **Then** it is one JSON file following the app-owned schema.
3. **Given** a save is interrupted by crash or exit, **When** the app next reads the file, **Then** the previous complete version is intact.

### User Story 2 - Conversations are listed from a manifest (Priority: P2)

The app reads a manifest to know which conversations exist.

**Why this priority**: The manifest enables the beta history list and later search without scanning every file.

**Independent Test**: Create two conversations; confirm the manifest lists both with their metadata.

**Acceptance Scenarios**:

1. **Given** two saved conversations, **When** the manifest is read, **Then** it lists both with their metadata.
2. **Given** a new conversation is saved, **When** it is persisted, **Then** the manifest entry is created or updated.

### Edge Cases

- A corrupt conversation file must be reported, not crash the app.
- An empty conversation must still be valid to save.
- A missing manifest must be treated as an empty history, not an error.
- A new conversation whose filename already exists on disk but is not referenced by the manifest must get a fresh unique filename; the orphan file is left untouched.
- A manifest entry referencing a missing file must be dropped or repaired without crashing.
- A valid conversation file missing from the manifest must be repaired into the manifest at startup.

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
- **FR-009**: Storage MUST sit behind an interface so a future storage backend can replace file storage.
- **FR-010**: The schema MUST tolerate future optional message fields (update time, parent message ID, error, metadata) without breaking beta readers.
- **FR-011**: The persisted message status vocabulary is `complete`, `stopped`, and `error`. Transient statuses (queued, sending, streaming) MUST be normalized to a terminal value at save and at restore.
- **FR-012**: The storage and schema layer MUST be implementable without Electron so the iOS app reuses it unchanged.

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
- **SC-005**: A beta build's storage dependencies contain no embedded database; storage is JSON files only.

## Assumptions

- Storage is local files on the device; the schema is stable for beta.
- Storage itself performs no conflict resolution; sync conflict policy is owned by spec 104.
- The manifest is plain JSON, read by the beta history list (spec 105) and by future search.
- Overwrite semantics are acceptable in beta; conflict resolution is out of scope at the storage layer.
