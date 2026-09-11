# Feature Specification: Provider Key Gate

**Feature Branch**: `108-provider-key-gate`

**Created**: 2026-09-11

**Status**: Draft

**Input**: User description: "The provider-key gate: when no OpenRouter API key is stored, the app presents the key import flow (spec 103) before or at the user's first send, so the first prompt is not sent into a missing-key error. Extracted from the former spec 105 chat-session-flow."

## User Scenarios & Testing

### User Story 1 - Import the key at first send (Priority: P1)

The user opens the app on a fresh install, types a prompt, and is asked for the provider key before the prompt is sent.

**Why this priority**: The app cannot answer anything without a key, and the first send is where the user expects to be asked rather than to see a failure.

**Independent Test**: On a fresh install with no stored key, type a prompt, send it, and confirm the key import flow opens before any request is sent.

**Acceptance Scenarios**:

1. **Given** no stored provider key, **When** the user submits a prompt, **Then** the key import flow (spec 103) opens and no request is sent until a key is stored.
2. **Given** the key import succeeds, **When** the import completes, **Then** the prompt is preserved and the send proceeds or can be retried without retyping.
3. **Given** the key import is cancelled, **Then** no request is sent and the composer draft is retained.

### User Story 2 - An already stored key skips the gate (Priority: P2)

A user with a key never sees the gate.

**Why this priority**: The gate must not intrude once setup is done.

**Independent Test**: Store a key, send a prompt, and confirm no key import flow appears.

**Acceptance Scenarios**:

1. **Given** a provider key is already stored, **When** the user sends a prompt, **Then** the request is sent and no key import flow appears.

### Edge Cases

- The stored key is removed after the gate passed; the next send fails with the missing-key error and the draft is retained.
- A missing-key provider error arrives even though a key was thought stored; it is reported without losing the draft.
- The gate applies on desktop and iOS, using the platform file chooser or document picker (specs 103 and 106).

## Requirements

### Functional Requirements

- **FR-001**: When no provider key is stored, the app MUST present the key import flow (spec 103, archived) before or at the user's first send.
- **FR-002**: A prompt MUST NOT be sent into a missing-key error as the normal first-run path; the gate MUST intercept before the request.
- **FR-003**: If the user cancels the import, the send MUST be aborted and the composer draft MUST be retained.
- **FR-004**: If a provider key is already stored, the gate MUST NOT appear.
- **FR-005**: A missing-key error from the provider MUST still be handled when it occurs, reported without losing the draft.
- **FR-006**: The gate MUST use the spec 103 import flow and MUST NOT introduce a second credential store.
- **FR-007**: Beta MUST NOT include accounts, login, or authentication.

### Key Entities

- **Provider Key**: The OpenRouter API key stored by spec 103.
- **Gate**: The pre-send step that offers key import when no key is stored.

## Success Criteria

### Measurable Outcomes

- **SC-001**: On a fresh install, the first send presents key import instead of failing with a missing-key error.
- **SC-002**: Cancelling the gate sends nothing and keeps the draft.
- **SC-003**: With a stored key, no gate appears.

## Assumptions

- The import mechanism, validation, and storage are owned by spec 103 (archived).
- Whether the retained prompt auto-sends after a successful import or waits for the user to send again is a plan decision; the spec requires only that the prompt is not lost.
- The gate shares one flow across desktop and iOS through the shared component (spec 106), using the platform file chooser on desktop and the platform document picker on iOS.
- This extracts the first-send key requirement formerly in spec 105 FR-008.
