# Feature Specification: Shared Chat Component - Streaming and Operations

**Feature Branch**: `006-shared-chat-streaming-operations`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "Streaming and message operations for the shared chat component: incremental display of responses, message and chat statuses, per-operation identity, stop, copy, retry, and regenerate, with stale updates ignored."

## User Scenarios & Testing

### User Story 1 - Watch a response stream in (Priority: P1)

The assistant response appears incrementally as it arrives, rendering partial Markdown as it goes.

**Why this priority**: Streaming is how AI chat feels live; waiting for the full response is a different product.

**Independent Test**: Feed deterministic response chunks and confirm they appear incrementally.

**Acceptance Scenarios**:

1. **Given** a response is streaming, **When** chunks arrive, **Then** each chunk appears without waiting for the full response.
2. **Given** a streaming response contains Markdown, **When** it is partially complete, **Then** the partial content renders without breaking the layout.

### User Story 2 - Stop a response mid-stream (Priority: P1)

The user stops a response while it is streaming; the partial content is retained.

**Why this priority**: Discarding partial content on stop would be data loss and is non-negotiable.

**Independent Test**: Stop during streaming; confirm the partial response is retained and the status becomes stopped.

**Acceptance Scenarios**:

1. **Given** a response is streaming, **When** the user stops it, **Then** the partial content remains visible.
2. **Given** a response is stopped, **When** the user retries, **Then** a new response starts and supersedes the stopped one.

### User Story 3 - Retry and regenerate (Priority: P1)

The user retries a failed response or regenerates a completed one.

**Why this priority**: Retry and regenerate are the main recovery and variation actions.

**Independent Test**: Retry a failed response and regenerate a completed response; confirm each produces a new streamed answer.

**Acceptance Scenarios**:

1. **Given** a response ended in error, **When** the user retries, **Then** a new response is requested for the same prompt.
2. **Given** a completed response, **When** the user regenerates, **Then** a new response replaces it.
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
- The draft must be preserved while a response streams.

## Requirements

### Functional Requirements

- **FR-001**: Responses MUST display incrementally as chunks arrive.
- **FR-002**: Partial Markdown MUST render during streaming without breaking the layout.
- **FR-003**: Messages MUST have a status drawn from queued, sending, streaming, complete, stopped, and error.
- **FR-004**: Each submit, retry, or regeneration MUST carry an operation ID.
- **FR-005**: Updates from a superseded operation MUST NOT change a newer response.
- **FR-006**: Stop MUST retain partial content.
- **FR-007**: Copy, retry, and regenerate actions MUST be available per message.
- **FR-008**: Duplicate Send and Stop events MUST NOT fire.
- **FR-009**: The draft MUST be preserved during streaming and updates.

### Key Entities

- **Message Status**: queued, sending, streaming, complete, stopped, error.
- **Chat Status**: idle, submitting, streaming, stopping, error.
- **Operation**: A submit, retry, or regeneration with a unique ID.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Streaming chunks appear incrementally.
- **SC-002**: Stop retains partial content in every ordering.
- **SC-003**: Superseded operation updates never change a newer response.
- **SC-004**: No duplicate Send or Stop events are emitted.

## Assumptions

- The host application drives network requests; the component renders state.
- The network may be slow or flaky; the component must tolerate many small updates and reordering.