# Feature Specification: Shared Chat Component - Message Rendering

**Feature Branch**: `002-shared-chat-message-rendering`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "Message rendering for the shared chat component: distinct roles, formatted assistant responses as Markdown, selectable text, code blocks with copy, a fallback for unsupported content, and no execution of raw HTML or remote images."

## User Scenarios & Testing

### User Story 1 - Read assistant responses as formatted Markdown (Priority: P1)

Assistant responses render as formatted Markdown: headings, emphasis, lists, blockquotes, links, inline code, and fenced code blocks.

**Why this priority**: Reading formatted responses is the core value of a chat app. Unformatted text is unreadable for long answers.

**Independent Test**: A response with the full Markdown element set renders correctly without a parser or renderer built in this project.

**Acceptance Scenarios**:

1. **Given** an assistant response contains Markdown, **When** it is displayed, **Then** the formatting renders (headings, emphasis, lists, blockquotes, links, inline code, fenced code blocks, horizontal rules).
2. **Given** a response contains a fenced code block, **When** it is displayed, **Then** the code is selectable and horizontally scrollable, and a copy control is available.
3. **Given** a response contains a link, **When** the user activates it, **Then** navigation is delegated to the host app, never performed inside the component.
4. **Given** a response contains a table, **When** it is displayed, **Then** it renders formatted or as plain text, never as broken layout.

### User Story 2 - Distinguish message roles visually (Priority: P1)

User prompts and assistant responses are visually distinct and aligned so the conversation reads correctly.

**Why this priority**: Confusing who said what breaks the conversation.

**Independent Test**: A conversation with user and assistant messages; each role has a distinct visual treatment and alignment.

**Acceptance Scenarios**:

1. **Given** a user message, **When** it is displayed, **Then** it is visually distinct from assistant messages and aligned to the right.
2. **Given** an assistant response, **When** it is displayed, **Then** it is aligned to the left.
3. **Given** a system message, **When** it is displayed, **Then** it renders in a distinct, non-conversational treatment.

### User Story 3 - Safe by default (Priority: P1)

Raw HTML, remote images, and executable content are inert.

**Why this priority**: The component renders untrusted model output; any code execution or automatic network fetch is a security defect.

**Independent Test**: A response containing scripts, event handlers, and embeds renders as inert text.

**Acceptance Scenarios**:

1. **Given** a message contains raw HTML, **When** it is displayed, **Then** the HTML is never rendered as markup.
2. **Given** a message references a remote image, **When** it is displayed, **Then** the image is not loaded by default.
3. **Given** a response contains a `javascript:` link, an inline event-handler attribute, or an embed, **When** it is displayed, **Then** nothing executes and the element is inert.

### User Story 4 - Copy text without side effects (Priority: P3)

The user selects and copies message text and code; selection triggers no actions, and denied clipboard access fails visibly.

**Why this priority**: Copying is frequent but secondary; it must not misfire.

**Independent Test**: Select text across a message, confirm no action fires; deny clipboard access and copy a code block, confirm a visible failure.

**Acceptance Scenarios**:

1. **Given** the user drags a text selection across a message, **When** the selection completes, **Then** no message action fires.
2. **Given** clipboard access is denied, **When** a copy control is activated, **Then** a visible failure state appears.

### Edge Cases

- Partial or malformed Markdown must not break rendering.
- A large Markdown response (6 KB) must render without freezing.
- HTML-looking text inside a code block must appear as literal text.
- A very long unbroken string (such as a URL) must wrap or scroll without breaking layout.
- Markdown-like characters in a user prompt must render literally as typed.

## Requirements

### Functional Requirements

- **FR-001**: Assistant responses MUST render these Markdown elements: paragraphs, headings, emphasis and strong text, ordered and unordered lists, blockquotes, links, inline code, fenced code blocks, and horizontal rules.
- **FR-002**: Tables and task lists MAY be supported; where not supported they MUST render as plain text or through the fallback renderer without breaking the layout.
- **FR-003**: User prompts MUST render as plain text; Markdown-like characters MUST render literally as typed.
- **FR-004**: User, assistant, and system roles MUST be visually distinct. User prompts align right and assistant responses align left as the default treatment.
- **FR-005**: Code blocks MUST be selectable, horizontally scrollable, and have a copy control.
- **FR-006**: Raw HTML MUST NOT be rendered as markup.
- **FR-007**: Remote images MUST NOT be loaded by default.
- **FR-008**: The component MUST NOT execute code of any kind.
- **FR-009**: Unsupported content types MUST render through a fallback renderer.
- **FR-010**: Text selection MUST NOT trigger message actions.
- **FR-011**: A Markdown response of 6 KB MUST render without perceptible freezing.
- **FR-012**: Link activation MUST be delegated to the host application.
- **FR-013**: Code blocks MAY support optional syntax highlighting.
- **FR-014**: The component MUST use an existing Markdown library for parsing and rendering; a Markdown parser or renderer MUST NOT be built in this project.

### Key Entities

- **Message**: Contains one or more content parts, each typed.
- **Content Part**: The unit of message content; initial type is text (plain or Markdown).
- **Renderer**: Maps a content type to its display; replaceable by the host.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A response using every supported Markdown element renders correctly.
- **SC-002**: A 6 KB Markdown response renders without perceptible freezing.
- **SC-003**: Raw HTML is never rendered, remote images are never loaded, and nothing executes.
- **SC-004**: Unsupported content shows a fallback instead of breaking the list.

## Assumptions

- An existing Markdown component provides parsing and rendering (FR-014); the initial candidate is recorded in `docs/react-component-overview.md`, and the choice is made in the plan for this spec.
- The chosen Markdown component must render acceptably on both the mobile and desktop rendering targets.
- The host application handles link navigation.
- Raw HTML and remote images are disabled by default, matching the personal-use and safety posture of the app.

## Clarifications

- 2026-09-07: The large-response bound is 6 KB, not 100 KB. The app targets personal chat; a 500-word response is ~3 KB and a long one is ~1000 words (~6 KB). 100 KB was document scale, which is future work for the desktop app, not a beta requirement for the shared chat component. (The bound was first set to 10 KB and lowered to 6 KB on the same day.)