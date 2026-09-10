# Feature Specification: OpenRouter AI Provider

**Feature Branch**: `102-openrouter-provider`

**Created**: 2026-09-07

**Status**: Archived

**Input**: User description: "The AI provider for beta: OpenRouter chat completions with streaming, the automatic model selection, and a provider interface that later providers can implement."

## User Scenarios & Testing

### User Story 1 - Send a message and get a response (Priority: P1)

The user sends a prompt and receives an assistant response using automatic model selection.

**Why this priority**: Generating responses is the core function of the app.

**Independent Test**: Send a prompt with no model configured; confirm a response is returned via automatic model selection and the requested model is recorded.

**Acceptance Scenarios**:

1. **Given** a valid API key, **When** the user sends a prompt, **Then** an assistant response is returned.
2. **Given** no model is configured, **When** a prompt is sent, **Then** the request uses automatic model selection and the requested model is recorded with the response.
3. **Given** a missing or invalid API key, **When** the user sends a prompt, **Then** a clear error is shown and nothing is lost.

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

### Edge Cases

- An empty completion must be stored as an empty assistant message with complete status and a retry affordance.
- A connection dropped mid-chunk must retain partial content, mark the message as error, and allow retry from the beginning.
- An unparseable chunk must be skipped cleanly; already-rendered content must not be corrupted.
- A multi-megabyte response must stream and store with bounded memory and no truncation.

## Requirements

### Functional Requirements

- **FR-001**: Beta MUST send chat-completions requests to the OpenRouter endpoint.
- **FR-002**: Beta MUST use the automatic model selection.
- **FR-003**: Responses MUST support streaming.
- **FR-004**: The provider MUST be behind an interface that a different provider can implement.
- **FR-005**: Provider-specific response fields MUST NOT enter the canonical conversation format (owned by spec 101).
- **FR-006**: Failed requests MUST produce a clear, retryable error that names the failure class (invalid key, rate limit, network), and the draft MUST be preserved.
- **FR-007**: Requests MUST use the locally stored API key (see spec 103).
- **FR-008**: The provider MAY expose the routed model name per response; beta records the requested model.

### Key Entities

- **Provider**: A chat-completions service implementing the provider interface.
- **Chat Request**: A prompt plus the conversation context.
- **Chat Response**: The assistant output, optionally streamed.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A prompt produces a streamed assistant response.
- **SC-002**: A second provider works without UI changes.
- **SC-003**: No provider-specific fields are stored in conversations.
- **SC-004**: Missing-key, rate-limit, and network errors are classed, clear, and non-destructive.

## Assumptions

- OpenRouter is the beta provider; others may follow.
- The API key is stored locally and imported via a file chooser (spec 103).
- The manifest stores the requested model in beta; recording the resolved model is future work (see spec 101).
- Responses may be large; streaming is required to keep the UI responsive.