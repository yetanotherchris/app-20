# Feature Specification: Shared Chat Component - Composer

**Feature Branch**: `003-shared-chat-composer`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "Composer for the shared chat component: a multiline input that grows and scrolls, Send and Stop controls, Enter and Shift+Enter behavior, input-method editor support, and sensible disabled states."

## User Scenarios & Testing

### User Story 1 - Send a message (Priority: P1)

The user types a message and sends it with the Send button or the Enter key on desktop.

**Why this priority**: Sending is the primary action of the app; it must be fast and obvious.

**Independent Test**: Type text, send with the button and with the keyboard, confirm the message is submitted and the draft clears.

**Acceptance Scenarios**:

1. **Given** a non-empty draft, **When** the user clicks Send, **Then** the draft is submitted.
2. **Given** a non-empty draft, **When** the user presses Enter on desktop, **Then** the draft is submitted.
3. **Given** an empty draft, **When** the user attempts to send, **Then** Send is disabled and nothing is submitted.

### User Story 2 - Compose a multiline message (Priority: P1)

The user writes a long message that grows the composer and scrolls internally past the maximum height.

**Why this priority**: Long prompts are common with AI; a one-line input would be unusable.

**Independent Test**: Type past the composer's maximum height; confirm the composer grows, then scrolls internally.

**Acceptance Scenarios**:

1. **Given** the composer starts at one line, **When** the user types more text, **Then** the composer grows with the content.
2. **Given** the composer reaches its maximum height, **When** the user keeps typing, **Then** the composer scrolls internally.
3. **Given** the user presses Shift+Enter on desktop, **When** the composer is multi-line, **Then** a newline is inserted instead of sending.

### User Story 3 - Stop a response (Priority: P2)

While a submission or streaming response can be cancelled, the composer shows a Stop control.

**Why this priority**: The user needs to interrupt a long or wrong response.

**Independent Test**: Submit, then stop during streaming; confirm the response stops and partial content is retained.

**Acceptance Scenarios**:

1. **Given** a submission is in progress, **When** the user presses Stop, **Then** the operation is cancelled and partial content is retained.
2. **Given** no operation can be cancelled, **When** the composer is idle, **Then** no Stop control is shown.

### User Story 4 - Compose with an input-method editor (Priority: P2)

Users of languages that need an input-method editor (IME) can compose without premature sends.

**Why this priority**: IME users are common in the target audience; a premature send on composition breaks input.

**Independent Test**: Compose a message with an IME and confirm no send fires during composition.

**Acceptance Scenarios**:

1. **Given** an IME composition is active, **When** the user confirms text, **Then** only the confirmed text is submitted.
2. **Given** pasted multiline text, **When** it is inserted, **Then** the composer treats it as one draft with the newlines intact.

### Edge Cases

- Send must fire exactly once per submit; no duplicate Send or Stop events.
- The draft must be preserved when the app re-renders or updates messages.
- A very long draft must not degrade typing performance.
- On touch devices the return key must insert a newline rather than send.

## Requirements

### Functional Requirements

- **FR-001**: The composer MUST start at one line.
- **FR-002**: The composer MUST grow with content to a configurable maximum height.
- **FR-003**: Past the maximum height the composer MUST scroll internally.
- **FR-004**: Send MUST be disabled when the draft is empty.
- **FR-005**: On desktop, Enter MUST send and Shift+Enter MUST insert a newline.
- **FR-006**: On touch devices, the return key MUST insert a newline.
- **FR-007**: A Stop control MUST be shown while submission or streaming can be cancelled.
- **FR-008**: The draft MUST remain controlled by the host; the component MUST NOT discard it on re-render.
- **FR-009**: IME composition MUST NOT trigger a send until the text is confirmed.
- **FR-010**: Pasted multiline text MUST be inserted with newlines intact.
- **FR-011**: Focus and keyboard-dismissal behavior MUST be configurable.

### Key Entities

- **Draft**: The in-progress composer text, controlled by the host.
- **Composer State**: Idle, submitting, streaming, stopping, or error.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A message is sent via the button and via the keyboard.
- **SC-002**: A newline can be added without sending.
- **SC-003**: The draft survives unrelated updates to the conversation.
- **SC-004**: IME composition never causes a premature send.

## Assumptions

- The draft is controlled by the host application, not owned by the component.
- Desktop and touch input conventions differ; both are supported.
- Stop retains partial content; discarding it would be data loss.