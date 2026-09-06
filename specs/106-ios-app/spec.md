# Feature Specification: iOS App

**Feature Branch**: `106-ios-app`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "The iOS app: the shared chat component running natively on iPhone, with safe areas, keyboards, input composition, dynamic type, focus, text selection, composer growth, scrolling, streaming, and stop all validated on device."

## User Scenarios & Testing

### User Story 1 - Chat on iPhone (Priority: P1)

The user chats on their iPhone with the same conversation experience as desktop.

**Why this priority**: iOS is a beta platform; the chat must be fully usable there.

**Independent Test**: On an iPhone, send a prompt and receive a streamed response using the shared component.

**Acceptance Scenarios**:

1. **Given** the iOS app is installed, **When** the user opens it, **Then** the chat screen renders within the safe areas.
2. **Given** a prompt is sent, **When** the response streams, **Then** it displays and the conversation persists.

### User Story 2 - Type with the iOS keyboard (Priority: P1)

Composing works with the software and hardware keyboards, including input composition.

**Why this priority**: Text input is the primary interaction; broken keyboard behavior makes the app unusable.

**Independent Test**: Type with the software keyboard, a hardware keyboard, and an input-method editor; confirm composition and sends.

**Acceptance Scenarios**:

1. **Given** the software keyboard is shown, **When** the user types, **Then** the composer grows and sends correctly.
2. **Given** an input-method editor is active, **When** the user composes, **Then** no premature send occurs.

### User Story 3 - Read with dynamic type (Priority: P2)

The user increases text size; the chat adapts.

**Why this priority**: Dynamic type is standard on iOS and cheap to honor.

**Acceptance Scenarios**:

1. **Given** the largest dynamic type size, **When** the chat renders, **Then** content is readable and not clipped.
2. **Given** the user scrolls during streaming, **When** content arrives, **Then** the scroll behavior matches the component's rules.

### Edge Cases

- Safe areas must be respected on all notch and home-indicator layouts.
- Focus and text selection must behave on touch.
- Composer growth and internal scrolling must work on small screens.
- Stop must retain partial content on iOS as on desktop.

## Requirements

### Functional Requirements

- **FR-001**: The iOS app MUST run the shared chat component.
- **FR-002**: The app MUST respect safe areas.
- **FR-003**: Composition MUST work with software and hardware keyboards.
- **FR-004**: Input-method editor composition MUST NOT trigger premature sends.
- **FR-005**: The app MUST support dynamic type.
- **FR-006**: Streaming, stop, composer growth, scrolling, and focus MUST behave as on desktop.
- **FR-007**: Conversations MUST persist on iOS as on desktop.

### Key Entities

- **iOS App**: The native app built from the shared component and the shared storage model.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A full chat loop works on an iPhone.
- **SC-002**: Keyboard and IME flows work without premature sends.
- **SC-003**: Dynamic type renders without clipping.
- **SC-004**: Streaming and stop behave identically to desktop.

## Assumptions

- iOS is built and distributed via a cloud build service; no beta distribution through the App Store when another supported method is available.
- Android is out of scope for beta.
- Native iOS views are checked at release; automated tests cover the shared web-rendered behavior.