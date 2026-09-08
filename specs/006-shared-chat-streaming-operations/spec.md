# Feature Specification: Shared Chat Component - Streaming and Operations

**Feature Branch**: `006-shared-chat-streaming-operations`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "Streaming and message operations for the shared chat component: incremental display of responses, message and chat statuses, per-operation identity, stop, copy, retry, and regenerate, with stale updates ignored."

## User Scenarios & Testing

### User Story 1 - Watch a response stream in (Priority: P1)

The assistant response appears incrementally as it arrives, rendering partial Markdown as it goes, and reaches a visible complete state.

**Why this priority**: Streaming is how AI chat feels live; waiting for the full response is a different product.

**Independent Test**: Feed deterministic response chunks and confirm they appear incrementally and the status transitions are visible.

**Acceptance Scenarios**:

1. **Given** a response is streaming, **When** chunks arrive, **Then** each chunk appears without waiting for the full response.
2. **Given** a streaming response contains Markdown, **When** it is partially complete, **Then** the partial content renders without breaking the layout.
3. **Given** a response is streaming, **When** the last chunk arrives, **Then** the message status changes from streaming to complete and the change is visible.
4. **Given** a response is streaming, **When** chunks arrive while the user is typing, **Then** typing continues without interruption.

### User Story 2 - Stop a response mid-stream (Priority: P1)

The user stops a response while it is streaming; the partial content is retained.

**Why this priority**: Discarding partial content on stop would be data loss and is non-negotiable.

**Independent Test**: Stop before the first chunk, mid-stream, and after the final chunk; confirm partial content is retained in each case and a second Stop is a no-op.

**Acceptance Scenarios**:

1. **Given** a response is streaming, **When** the user stops it, **Then** the partial content remains visible.
2. **Given** Stop is pressed as the final chunk arrives, **When** the race resolves, **Then** exactly one of stopped or complete is the final status, consistent with the retained content.
3. **Given** a stop was already pressed, **When** Stop is pressed again, **Then** the second press is a no-op.

### User Story 3 - Retry and regenerate (Priority: P1)

The user retries a failed response or regenerates a completed one.

**Why this priority**: Retry and regenerate are the main recovery and variation actions.

**Independent Test**: Retry a failed response and regenerate a completed response; confirm each produces a new streamed answer that replaces the old one in place.

**Acceptance Scenarios**:

1. **Given** a response ended in error, **When** the user retries, **Then** a new response is requested for the same prompt and replaces the failed one in place.
2. **Given** a completed response, **When** the user regenerates, **Then** a new response replaces it in place.
3. **Given** a regenerate is in progress, **When** a late update from the previous operation arrives, **Then** it is ignored.

### User Story 4 - Copy a message (Priority: P2)

The user copies a message's text or a code block.

**Why this priority**: Copying answers is a frequent need in a personal assistant.

**Independent Test**: Copy a message and a code block; confirm the clipboard content.

**Acceptance Scenarios**:

1. **Given** a message, **When** the user copies it, **Then** its text is on the clipboard.
2. **Given** a code block, **When** the user copies it, **Then** the code is on the clipboard.

### Edge Cases

- Stop before streaming starts and stop during streaming must both work.
- Duplicate Send and Stop events must not fire.
- Updates from superseded operations must not change a newer response.
- Replacing the conversation during streaming must not leak updates into the new conversation.
- The draft must be preserved while a response streams (draft semantics owned by spec 003).
- If the connection drops mid-response, the message transitions to error, partial content is retained, and retry is available.
- A retry of a response that ended in error with partial content replaces the failed response in place.

## Requirements

### Functional Requirements

- **FR-001**: Responses MUST display incrementally as chunks arrive.
- **FR-002**: Partial Markdown MUST render during streaming without breaking the layout.
- **FR-003**: Messages MUST have a status drawn from queued, sending, streaming, complete, stopped, and error.
- **FR-004**: Each submit, retry, or regeneration MUST carry an operation ID.
- **FR-005**: Updates from a superseded operation MUST NOT change a newer response.
- **FR-006**: Stop MUST retain partial content, and a second Stop MUST be a no-op.
- **FR-007**: Copy, retry, and regenerate actions MUST be available per message.
- **FR-008**: Duplicate Send and Stop events MUST NOT fire.
- **FR-009**: Streaming and updates MUST NOT alter the composer draft (draft semantics owned by spec 003).
- **FR-010**: The chat MUST expose its overall status (idle, submitting, streaming, stopping, error) and the Send and Stop affordances MUST reflect it.
- **FR-011**: Streaming updates MUST NOT interrupt typing.
- **FR-012**: Transient statuses (queued, sending, streaming) MUST NOT be persisted; the persisted status vocabulary is defined by spec 101.

### Key Entities

- **Message Status**: queued, sending, streaming, complete, stopped, error. This spec owns the runtime vocabulary.
- **Chat Status**: idle, submitting, streaming, stopping, error. This spec owns the vocabulary and its reflection in the Send and Stop affordances.
- **Operation**: A submit, retry, or regeneration with a unique ID.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Streaming chunks appear incrementally.
- **SC-002**: Stop retains partial content when pressed before the first chunk, mid-stream, and after the final chunk before completion; a second Stop is a no-op.
- **SC-003**: Superseded operation updates never change a newer response.
- **SC-004**: No duplicate Send or Stop events are emitted.
- **SC-005**: The chat status and the Send and Stop affordances agree in every state.

## Assumptions

- The host application drives network requests; the component renders state.
- Retry and regenerate replace the previous response in place; keeping both attempts is future work.
- The network may be slow or flaky; the component must tolerate many small updates and reordering.

## Clarifications

- **2026-09-08 - Message failure vs chat error**: A failed response marks the message `error` with its partial content retained and returns the chat status to `idle`, keeping the list visible and retry available. The chat status `error` is a conversation-level error set by the host (spec 005 renders the ErrorState for it); a message failure does not set it, because doing so would hide the conversation behind the error state.