# Feature Specification: Shared Chat Reference Presentation

**Feature Branch**: `spec-007-chat-reference-presentation`

**Created**: 2026-09-08

**Status**: Archived

**Input**: User request: "The initial chat component is functional now, however it doesn't look like a conventional LLM chat UI. Create Spec Kit specs to copy the attached screenshot's look and feel. The left-side drawer is not part of the component; use the right-side main panel/window."

## Scope and Reference

This feature changes the shared chat component's default presentation, not its conversation behavior. The reference is the light-theme ChatGPT screenshot supplied in the conversation on 2026-09-08. Its main panel has a white background, a centered reading column, right-aligned light-gray user bubbles, assistant text directly on the background, small response actions, and a rounded bottom composer. The following reference description records the relevant visual details without requiring the screenshot's message content as a test fixture.

The screenshot is approximately 1191 by 638 pixels. The excluded drawer occupies the first 217 pixels of width. Within the remaining main panel, assistant text starts around x=432 and ends around x=973; the composer spans approximately x=384 to x=1031. These are reference observations, not fixed screen coordinates for the component. The reading column is roughly 540 pixels wide and the composer roughly 650 pixels wide at this image scale. Both are centered within the main panel, not within the full image. User bubbles end at the reading column's right edge. The main panel has substantial horizontal whitespace, distinct gaps between turns, and space between the last response and the composer when the conversation is short.

### In Scope

- Default conversation layout, user bubbles, assistant typography, spacing, and surfaces.
- Default composer shape, placement, input, Send and Stop presentation.
- Presentation of existing message actions, history controls, unread controls, and conversation states.
- Responsive adaptation, existing themes, customization, and accessibility.
- Presentation in the existing component demonstration surface so the result can be verified without building additional application features.

### Out of Scope

- Left drawer, navigation, chat history sidebar, settings, pricing, help, and sidebar toggle. No space is reserved for a drawer.
- The screenshot's product header, model dropdown, login and signup buttons, branding, and account features. Application headers remain outside the shared component.
- New attachments, voice input, sharing, or other operations implied by the screenshot's plus, microphone, or share icons. Unsupported controls are omitted, not rendered as decorative buttons.
- Copying the screenshot's conversation text, product-specific placeholder, or disclaimer. Existing host-provided labels and content remain supported; no new disclaimer feature is introduced.
- Provider, storage, synchronization, session lifecycle, or message-operation changes.

## User Scenarios & Testing

### User Story 1 - Read a Conversation in the Reference Layout (Priority: P1)

The user reads a conversation in a centered column. Prompts appear in gray bubbles on the right, and assistant responses read as formatted text on the page rather than as matching chat bubbles.

**Why this priority**: Message layout and typography account for most of the difference between the current component and the requested reference.

**Independent Test**: Display a fixed conversation containing short and multiline user messages and a multi-paragraph assistant response. Compare the default light presentation with the reference description.

**Acceptance Scenarios**:

1. **Given** a wide light-theme chat panel, **When** a conversation renders, **Then** its reading column is centered within that panel with whitespace on both sides and no drawer or reserved drawer gutter.
2. **Given** short and multiline user messages, **When** they render, **Then** each uses a content-sized, right-aligned, rounded light-gray bubble constrained to the reading column, with dark readable text and no tail.
3. **Given** an assistant response containing paragraphs and emphasis, **When** it renders, **Then** text is left-aligned directly on the white canvas without an enclosing bubble, card, border, avatar, or repeated visible role heading.
4. **Given** a response with headings, lists, links, quotations, and code, **When** it renders, **Then** formatting and text selection remain available, paragraph spacing is consistent, and code-specific surfaces do not become an enclosing response card.
5. **Given** a short conversation, **When** the panel has spare vertical space, **Then** the first turn stays near the top of the conversation area rather than being bottom-aligned, while the composer remains at the bottom.

### User Story 2 - Write from the Bottom Composer (Priority: P1)

The user writes in a rounded composer that remains available while reading or receiving responses.

**Why this priority**: The bottom composer is the other main visual element in the reference and must retain the existing input behavior.

**Independent Test**: Type, submit, grow a multiline draft, scroll history, and stop a deterministic streaming response while observing composer placement and draft preservation.

**Acceptance Scenarios**:

1. **Given** an idle chat, **When** its default composer renders, **Then** it is centered near the panel's bottom edge, wider than the reading column on a wide panel, with a white surface, thin neutral outline, subtle shadow, and pill-shaped single-line form.
2. **Given** a draft is empty or non-empty, **When** the input changes, **Then** the right-end circular upward-arrow Send control is visibly disabled or enabled according to the existing send rules and has the accessible name Send.
3. **Given** a draft grows beyond one line, **When** more text is entered, **Then** the composer grows upward to its configured limit and then scrolls internally, keeping its controls reachable and the conversation area usable.
4. **Given** submission or streaming can be cancelled, **When** the composer renders, **Then** a distinguishable Stop control is reachable in the same right-end control area without changing the composer's overall width or losing the draft.
5. **Given** a long conversation, **When** the user scrolls, **Then** only the history scrolls; the composer remains available and the final message and its actions can be scrolled fully above it.
6. **Given** no host-added composer controls, **When** the composer renders, **Then** no plus or microphone button or empty placeholder space for those buttons appears.

### User Story 3 - Use Existing Actions and States (Priority: P2)

The user can still copy, retry, regenerate, return to the latest message, and recognize progress or errors without a permanent diagnostic toolbar dominating the conversation.

**Why this priority**: A presentation change must not hide existing functions or recovery paths.

**Independent Test**: Exercise each existing action and empty, loading, streaming, stopped, error, disabled, and read-only state with the new defaults.

**Acceptance Scenarios**:

1. **Given** an assistant message has available actions, **When** it renders, **Then** compact neutral action controls appear below its content, aligned with the response's left edge, and remain reachable by keyboard and touch without hover.
2. **Given** action availability changes, **When** the message updates, **Then** existing copy, retry, regenerate, and host action rules are preserved; no unsupported share action appears and no empty action strip remains when all actions are removed.
3. **Given** loading, streaming, stopped, or error status, **When** it is displayed, **Then** the state remains understandable without color alone, any existing recovery action remains reachable, and the state does not introduce a boxed wrapper around the whole response.
4. **Given** the user is reading earlier content while new messages arrive, **When** unread state appears, **Then** the existing return-to-latest action and count remain visible above the composer without covering its input or controls; activating it returns to the latest content.
5. **Given** an empty, disabled, or read-only chat, **When** it renders, **Then** its existing content and interaction restrictions remain intact within the same canvas and composer layout.
6. **Given** earlier history can be loaded, **When** the user loads it, **Then** the history control remains reachable and the visible reading position is preserved.

### User Story 4 - Use the Layout at Different Sizes and Themes (Priority: P1)

The user gets the same message hierarchy on narrow and wide panels, in dark mode, and with increased text size. Host customizations still apply.

**Why this priority**: The shared component already supports both desktop and mobile use and must not become a fixed-size screenshot reproduction.

**Independent Test**: Exercise narrow and wide panel sizes, 200% zoom, enlarged text, light and dark themes, high contrast, and host overrides while a conversation and draft are present.

**Acceptance Scenarios**:

1. **Given** a narrow panel, **When** the chat renders, **Then** reading content and composer fit the available width with side padding, user and assistant alignment remains distinct, and ordinary text does not cause panel-wide horizontal scrolling.
2. **Given** the on-screen keyboard is open, **When** the user types on a touch device, **Then** input and Send or Stop remain reachable above the keyboard and respect device safe areas.
3. **Given** 200% zoom or the largest supported text size, **When** the conversation renders, **Then** text and controls reflow without overlap or loss of functions; wide code and tables can scroll within their content area.
4. **Given** dark theme or high contrast is selected, **When** appearance changes, **Then** the centered layout, bubble distinction, and unboxed assistant presentation remain, while readable colors, body and control typography, and visible focus adapt to the selected theme.
5. **Given** a host supplies theme overrides, renderers, icons, labels, states, or controls, **When** the chat renders, **Then** those customizations continue to take precedence over the corresponding defaults.
6. **Given** a draft and a streaming conversation, **When** size or theme changes, **Then** the draft, operation state, and existing scroll-follow or reading-position behavior are preserved.

### Edge Cases

- Long unbroken text wraps within the message area; code and tables retain their existing local horizontal scrolling behavior.
- A very tall user message is not clipped by its rounded bubble or given a fixed height.
- Multiple consecutive messages of the same role retain ordering and readable separation.
- Visible system messages and unsupported-content fallbacks remain readable and distinguishable under their existing rules; they are not silently removed to match the reference.
- Long translated action labels and host-added composer controls must reflow without overlapping the draft or Send and Stop controls.
- Small panel heights and a maximum-height draft must retain access to both the input controls and scrollable conversation content.
- Focus, error information, and control boundaries may be more prominent than in the screenshot to meet existing accessibility requirements.

## Requirements

### Functional Requirements

- **FR-001**: The default light presentation MUST use the reference's white main canvas and centered, width-constrained conversation layout. Width and centering MUST depend on the component's available panel, not the surrounding application window or an assumed drawer.
- **FR-002**: At a reference-sized main panel of approximately 974 by 638 display pixels and standard text size, the reading column MUST be approximately 540 pixels wide and the composer approximately 650 pixels wide, each within 10% of these reference measurements and horizontally centered within 8 pixels. Narrower panels MUST shrink these widths to fit with side padding rather than overflow.
- **FR-003**: Default user messages MUST use right-aligned, content-sized, light-gray rounded bubbles with internal padding, no tail, and a maximum width within the reading column. Default assistant messages MUST be left-aligned and unboxed, without repeated visible role headings or avatars. Message roles MUST remain accessible.
- **FR-004**: Default body text MUST use a readable regular-weight sans-serif appearance, consistent line spacing, separate paragraph spacing, and larger gaps between turns than between lines. Markdown emphasis and document hierarchy MUST remain distinguishable. Exact font, spacing, and color choices MUST be recorded during planning against the reference rather than inferred independently during implementation.
- **FR-005**: The composer MUST be centered at the bottom of the available chat area, separate from scrolling history, with rounded corners, a thin neutral outline, a subtle shadow, and a wider footprint than the reading column at the reference size. It MUST grow upward and then scroll internally under the existing configured height limit.
- **FR-006**: Default Send MUST be a circular upward-arrow control at the composer's right end with accessible name Send and distinguishable enabled, disabled, and focused states. Stop MUST occupy the same control area when cancellation is available and retain its existing meaning and accessible name. Neither control may be reduced below existing minimum target sizes to match the screenshot.
- **FR-007**: Existing message actions MUST use a compact, left-aligned row beneath assistant content. Action availability, grouping, context, and host customization MUST remain unchanged; empty action rows and unsupported screenshot controls MUST be absent.
- **FR-008**: The history MUST remain independently scrollable with sufficient bottom clearance to reveal the entire last message and its actions above the composer. Earlier-history and return-to-latest controls MUST remain reachable without obscuring composer controls.
- **FR-009**: Empty, loading, streaming, stopped, error, disabled, and read-only states MUST preserve their existing semantics and recovery actions within the new presentation. Normal completed responses MUST NOT show persistent diagnostic status labels or debug panels by default; host-requested metadata remains supported.
- **FR-010**: The component MUST preserve the message ordering, identity, scrolling, Markdown, draft, keyboard, composition, cancellation, and message-operation requirements of specs 001 through 006. This feature MUST NOT change the data or session behavior to obtain a visual match.
- **FR-011**: Light, dark, custom-theme, high-contrast, reduced-motion, keyboard, touch-target, and enlarged-text requirements MUST remain satisfied. Accessibility takes precedence over the reference's faint text, low-contrast outlines, and small icon appearance.
- **FR-012**: The new presentation MUST be the default shared-component appearance and be visible in its existing demonstration surface without host-specific duplicate layouts. Existing replacement renderers, controls, actions, states, icons, labels, and theme overrides MUST remain supported.
- **FR-013**: The component MUST NOT introduce or reserve layout space for the reference's drawer, product header, account controls, model selector, attachments, voice, sharing, or disclaimer. Host-added controls already supported by customization are unaffected.
- **FR-014**: Body and control typography (message text, response actions, Send and Stop labels and icons, and visible status text) MUST be driven by the theme's semantic typography tokens so font, size, weight, and line height adapt across light, dark, high-contrast, and enlarged-text settings. The reference's exact type choices MUST be recorded during planning and applied as theme defaults.
- **FR-015**: The presentation MUST remain usable on mobile viewports: the reading column and composer fit within safe-area width, message alignment stays distinct, and input, Send, Stop, actions, unread, and history controls remain reachable above the on-screen keyboard with no panel-wide horizontal overflow.

## Success Criteria

### Measurable Outcomes

- **SC-001**: At a 974 by 638 reference panel in light theme, a fixed conversation satisfies FR-002's width and centering tolerances and all six visual checks: white canvas, gray right-aligned user bubbles, unboxed assistant text, separated paragraphs and turns, compact response actions, and a bottom rounded composer. A reference comparison records a pass or an explicit discrepancy for each check before implementation is accepted.
- **SC-002**: At panel sizes 390 by 844, 974 by 638, and 1440 by 900, no ordinary message text or composer causes panel-wide horizontal overflow, and the last response and all its actions can be brought fully into view above the composer.
- **SC-003**: All acceptance scenarios pass, including send by button and keyboard, newline entry, multiline growth, Stop with retained content, copy, retry, regenerate, history loading, and return to latest, without changed operation or draft behavior.
- **SC-004**: Light, dark, high-contrast, 200% zoom, enlarged-text, and keyboard-only checks show no clipped text, overlapping controls, inaccessible actions, invisible focus, or typography that fails to follow the active theme. Existing accessibility checks pass without weakening them.
- **SC-005**: Existing customization checks pass for themes, message and content renderers, controls, icons, labels, actions, and states; no host-specific component fork is required.
- **SC-006**: The default component contains zero sidebar, account, model-selection, upload, microphone, share, or product-branding controls introduced solely to reproduce the screenshot.

## Assumptions

- The screenshot defines the default light-theme visual direction, not a requirement to copy product branding or add the depicted service's capabilities. Dark appearance preserves the same hierarchy using the existing dark theme.
- Reference measurements are approximate because the supplied image may have been scaled. FR-002 uses tolerances for this reason; it does not require fixed desktop dimensions on smaller panels.
- The reference's personal conversation content is not needed to test visual similarity. Use deterministic neutral content with comparable line lengths, paragraph counts, and emphasis.
- Existing host labels remain in use rather than adding a product-specific placeholder or a new empty-state greeting.
- One presentation spec covers this change because the existing functional specs already define conversation behavior. Technical planning and ordered implementation tasks follow separately; this specification does not authorize unrelated application features.

## Dependencies and Requirement Changes

- [001 Message List](../archive/001-shared-chat-message-list/spec.md), [002 Message Rendering](../archive/002-shared-chat-message-rendering/spec.md), [003 Composer](../archive/003-shared-chat-composer/spec.md), [004 Themes and Customization](../archive/004-shared-chat-themes-customization/spec.md), [005 Accessibility](../archive/005-shared-chat-accessibility/spec.md), and [006 Streaming and Operations](../archive/006-shared-chat-streaming-operations/spec.md) continue to define behavior. This spec changes their default visual presentation only.
- The earlier overview called for assistant responses in left-aligned bubbles. This feature deliberately replaces that presentation with left-aligned unboxed assistant text to match the supplied reference. User messages remain right-aligned bubbles.
- The screenshot is available in the originating conversation, not as a repository image file. The observations and measurements above provide a durable text reference; no repository image attachment is claimed. A visual baseline produced during implementation must be checked against the supplied reference, not accepted solely because it matches the implementation's first rendering.
