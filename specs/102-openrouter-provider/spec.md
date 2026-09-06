# Feature Specification: OpenRouter AI Provider

**Feature Branch**: `102-openrouter-provider`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "The AI provider for beta: OpenRouter chat completions with streaming, the automatic model selection, and a provider interface that later providers can implement."

## User Scenarios & Testing

### User Story 1 - Send a message and get a response (Priority: P1)

The user sends a prompt and receives an assistant response.

**Why this priority**: Generating responses is the core function of the app.

**Independent Test**: Send a prompt; confirm a response is returned for the automatic model.

**Acceptance Scenarios**:

1. **Given** a valid API key, **When** the user sends a prompt, **Then** an assistant response is returned.
2. **Given** a missing or invalid API key, **When** the user sends a prompt, **Then** a clear error is shown and nothing is lost.

### User Story 2 - See the response stream (Priority: P2)

The response arrives incrementally rather than all at once.

**Why this priority**: Streaming keeps the chat feeling live and matches the component's streaming behavior.

**Independent Test**: Send a prompt and confirm the response content arrives in increments.

**Acceptance Scenarios**:

1. **Given** a request is in flight, **When** chunks arrive, **Then** the content is delivered incrementally.
2. **Given** the user stops a request, **When** the provider cancels, **Then** partial content is retained.

### User Story 3 - Switch providers later (Priority: P3)

A future provider is added without changing the chat UI.

**Why this priority**: The overview calls for extensible provider patterns; providers other than OpenRouter are expected later.

**Independent Test**: Register a second provider implementation behind the same interface and confirm the app uses it.

**Acceptance Scenarios**:

1. **Given** a provider interface, **When** a new provider implements it, **Then** the chat UI works without modification.
2. **Given** provider-specific fields in a response, **When** the response is stored, **Then** they are not written into the canonical conversation format.

### Edge Cases

- Network failure must produce a retryable error.
- An empty response must be handled without a crash.
- Provider-specific errors must be shown in human-readable form.

## Requirements

### Functional Requirements

- **FR-001**: Beta MUST send chat-completions requests to the OpenRouter endpoint.
- **FR-002**: Beta MUST use the automatic model selection.
- **FR-003**: Responses MUST support streaming.
- **FR-004**: The provider MUST be behind an interface that a different provider can implement.
- **FR-005**: Provider-specific response fields MUST NOT enter the canonical conversation format.
- **FR-006**: Failed requests MUST produce a clear, retryable error.
- **FR-007**: Requests MUST use the locally stored API key.

### Key Entities

- **Provider**: A chat-completions service implementing the provider interface.
- **Chat Request**: A prompt plus the conversation context.
- **Chat Response**: The assistant output, optionally streamed.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A prompt produces a streamed assistant response.
- **SC-002**: A second provider works without UI changes.
- **SC-003**: No provider-specific fields are stored in conversations.
- **SC-004**: Missing-key and network errors are clear and non-destructive.

## Assumptions

- OpenRouter is the beta provider; others may follow.
- The API key is stored locally and imported via a file chooser.
- Responses may be large; streaming is required to keep the UI responsive.