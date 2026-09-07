# Feature Specification: Shared Chat Component - Message List

**Feature Branch**: `001-shared-chat-message-list`

**Created**: 2026-09-07

**Status**: Archived

**Input**: User description: "Message list for the shared chat component: stable message identity, automatic follow of streaming content at the bottom, preserved reading position while scrolled up, earlier-message loading, unread indicators, and responsiveness for very long conversations."

## User Scenarios & Testing

### User Story 1 - Follow the conversation from the bottom (Priority: P1)

The user sits at the latest message. New messages and streaming updates appear automatically without any action.

**Why this priority**: Following the newest content is the primary way a personal chat app is used. If new content requires manual scrolling, the app feels broken.

**Independent Test**: A conversation with incoming messages; at the bottom, the newest content stays visible with no user action.

**Acceptance Scenarios**:

1. **Given** the user is scrolled to the bottom, **When** a new message arrives, **Then** it is visible without scrolling.
2. **Given** the user is scrolled to the bottom, **When** a message streams new content, **Then** the growing content stays visible.
3. **Given** content is below the fold, **When** the user scrolls to the bottom, **Then** the newest content is shown.
4. **Given** a message is streaming, **When** its content updates many times, **Then** the message keeps the same identity and position with no flicker or remount.

### User Story 2 - Read earlier content without disruption (Priority: P1)

The user scrolls up to re-read. New messages must not move the viewport.

**Why this priority**: Being forced back to the bottom while reading loses context and is a major annoyance.

**Independent Test**: Scroll up, receive new messages, confirm the visible messages do not move.

**Acceptance Scenarios**:

1. **Given** the user is reading earlier content, **When** a new message arrives, **Then** the visible messages do not move.
2. **Given** the user is reading earlier content, **When** new messages arrive, **Then** an unread count appears and equals the number of messages below the viewport.
3. **Given** the unread count is visible, **When** the user activates the scroll-to-latest control, **Then** the viewport returns to the newest message and the unread count clears.

### User Story 3 - Load earlier messages (Priority: P2)

The user has an older conversation and wants to see more of its history.

**Why this priority**: A personal app accumulates history; without loading, old conversations are truncated.

**Independent Test**: In a long conversation, load earlier messages and confirm the current viewport does not jump.

**Acceptance Scenarios**:

1. **Given** earlier messages exist, **When** the user requests them, **Then** they are appended above the current viewport.
2. **Given** earlier messages are loading, **When** the load completes, **Then** the currently visible messages stay in place.
3. **Given** the user has loaded back to the first message, **When** no earlier messages remain, **Then** the load control is removed or disabled.

### Edge Cases

- A conversation of 1,000 messages must stay responsive.
- Streaming continues while the user is scrolled up; the unread state must not reset on each chunk.
- A message that is replaced or removed while visible must not corrupt the list.
- Very long single messages must not freeze the list.
- Loading earlier messages while a response streams at the bottom must preserve both the history anchor and bottom-follow.

## Requirements

### Functional Requirements

- **FR-001**: The list MUST keep the newest content visible whenever the user is at the bottom.
- **FR-002**: The list MUST NOT move the visible position while the user is reading earlier content.
- **FR-003**: At the bottom means within one message height of the viewport bottom. Inside that range the list auto-follows; beyond it the list pins and shows unread state.
- **FR-004**: The list MUST provide an explicit action to return to the latest message.
- **FR-005**: The list MUST provide a control to load earlier messages when history exists.
- **FR-006**: The list MUST show an unread count for messages below the viewport, not per streaming chunk. Unread state MUST clear when the user returns to the latest message.
- **FR-007**: Each message MUST keep a stable identity from first render through streaming and edits.
- **FR-008**: A conversation of 1,000 messages MUST render and scroll without degradation.
- **FR-009**: The list MAY display optional timestamps, grouping, and status indicators.
- **FR-010**: Interactive elements MUST expose stable identifiers for automated tests.
- **FR-011**: Content outside the rendered window MUST NOT be parsed or measured eagerly.

### Key Entities

- **Message**: A single exchange entry with identity, role, content, and status.
- **Conversation**: An ordered collection of messages rendered by the list.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A 1,000-message conversation renders in under 2 seconds, and continuous scrolling shows no stall longer than 100 ms.
- **SC-002**: A scrolled-up reading position is preserved when new messages arrive.
- **SC-003**: Returning to the latest message takes at most one action.
- **SC-004**: Loading earlier messages does not move the visible anchor.
- **SC-005**: Message identity is stable across streaming updates, edits, and reloads.

## Assumptions

- The component serves a single user; multiple devices are supported through sync (spec 104). Multi-user presence is out of scope.
- Conversations can grow large, so the list must not render all content eagerly.
- Streaming updates arrive frequently during a response; the list must tolerate many small updates.