# React Chat Component Overview

## Purpose

- Standalone AI chat UI component.
- Published as a versioned package from a separate repository.
- Supports Expo applications on iOS.
- Supports React Native Web applications in Electron.
- Uses React Native primitives so the UI is shared across both platforms.

## Technology

- React Native and TypeScript.
- React Native Web for Electron rendering.
- NativeWind for Tailwind-compatible styling.
- An existing React Native-compatible Markdown component, initially `react-native-markdown-display` subject to React Native Web validation.
- Vitest and React Native Testing Library for component tests.
- Playwright for React Native Web and Electron end-to-end tests.
- Expo example application for iOS validation.

React, React Native, and React Native Web are peer dependencies. The package documents the NativeWind configuration required by consumers.

## Initial Features

- User, assistant, and system messages.
- Plain-text user input.
- Markdown assistant responses.
- Incremental display of streaming responses.
- ChatGPT-style multiline composer.
- Send and Stop controls.
- Copy, retry, and regenerate actions.
- Automatic scrolling while the user is at the bottom.
- Scroll to latest control when the user is reading earlier content.
- Loading, streaming, stopped, and error states.
- Light, dark, and custom themes.
- Mobile and desktop layouts.
- Keyboard support.

## Main Component

The main `Chat` component is controlled by the consuming application.

Inputs:

- Messages.
- Draft text.
- Chat status.
- Active operation and target message.
- Current error.
- Earlier-message availability and loading state.
- Enabled capabilities.
- Disabled and read-only states.
- Theme and class overrides.
- Custom renderers and actions.
- Visible and accessible labels.

The application updates messages as streaming content arrives. The component does not manage network requests or infer state from callback completion.

## Message Model

Each message includes:

- ID.
- Role.
- Content parts.
- Status.
- Creation time.
- Optional update time.
- Optional parent message ID for response branches.
- Optional error and metadata.

Initial message content is text formatted as plain text or Markdown. Future content types include attachments, images, citations, tool calls, and tool results. Unsupported content uses a fallback renderer.

Message statuses are queued, sending, streaming, complete, stopped, and error.

Chat statuses are idle, submitting, streaming, stopping, and error.

Each submit, retry, or regeneration has an operation ID. This prevents late streaming updates from changing a newer response.

## Composer

- Starts at one line.
- Grows to a configurable maximum height.
- Scrolls internally after reaching the maximum height.
- Preserves controlled draft text until the application changes it.
- Disables Send for an empty draft.
- Supports pasted multiline text.
- Supports input-method editor composition.
- Uses Enter to send and Shift+Enter for a newline on desktop by default.
- Uses the return key for a newline on touch devices by default.
- Shows Stop while submission or streaming can be cancelled.
- Supports configurable focus and keyboard-dismissal behavior.

## Markdown

- Use the selected Markdown component for parsing and rendering.
- Do not implement a Markdown parser or renderer in this package.
- Paragraphs.
- Headings.
- Emphasis and strong text.
- Ordered and unordered lists.
- Blockquotes.
- Links.
- Inline code.
- Fenced code blocks.
- Horizontal rules.
- Optional tables and task lists.
- Selectable text.
- Horizontally scrollable code blocks.
- Copy control for code blocks.
- Optional syntax highlighting.

Raw HTML and remote images are disabled by default. The application handles link navigation. The component does not execute code.

## Message List

- Virtualized rendering for long conversations.
- Variable-height messages.
- Stable message identity during streaming.
- Earlier-message loading without moving the visible content.
- Optional timestamps, grouping, and status indicators.
- Text selection without triggering message actions.
- Accessible Load earlier control.
- Stable identifiers for automated tests.

The list follows streaming content only while the user is at the bottom. Unread counts represent messages below the viewport, not individual streaming updates.

## Events

### Composer

- Draft changed.
- Submit requested.
- Stop requested.
- Composer focused or blurred.
- Composer height changed.
- Attachment selection requested.
- Attachment added, removed, or retried.
- Voice input started, stopped, or cancelled.

### Messages

- Message pressed or long-pressed.
- Message copied.
- Retry requested.
- Regeneration requested.
- Edit submitted.
- Delete requested.
- Feedback changed.
- Share requested.
- Custom action invoked.
- Response branch selected.
- Read-aloud started, paused, resumed, or stopped.

### Content

- Link opened.
- Citation opened.
- Code block copied.
- Attachment opened or downloaded.
- Image opened.
- Tool call approved or rejected.
- Expandable content opened or closed.

### Message List

- Earlier messages requested.
- Visible message range changed.
- Bottom-of-list state changed.
- Unread count changed.
- Scroll to latest requested.

### Errors

- Renderer failed.
- Unsupported content encountered.
- Clipboard operation failed.

Event payloads include relevant IDs and the interaction source. Re-rendering and prop changes do not repeat events.

## Customization

- Replace the complete message renderer.
- Replace individual content renderers.
- Replace the Markdown renderer.
- Add Markdown element renderers.
- Add message actions.
- Add composer controls.
- Replace Send, Stop, and Scroll to latest controls.
- Replace empty, loading, typing, and error states.
- Configure grouping and action availability.
- Supply application icons.
- Override semantic theme tokens and NativeWind classes.

## Accessibility

- WCAG 2.2 AA for React Native Web output.
- Accessible names for all controls.
- Keyboard navigation and visible focus indicators.
- Minimum iOS touch target sizes.
- Dynamic type and browser zoom support.
- Reduced-motion and high-contrast support.
- Status information that does not rely on color.

Screen-reader announcements are out of scope for beta. This is a personal-use app; read-aloud via text-to-speech may be added later if needed.

## Performance

- Completed messages do not re-render for each streaming update.
- Streaming updates do not interrupt typing.
- Test fixture with at least 1,000 messages.
- Test fixture with a Markdown response of at least 6 KB.
- Markdown outside the rendered list window is not parsed unnecessarily.

## Package Requirements

- ESM package with TypeScript declarations.
- Documented React Native entry point.
- Semantic versioning and changelog.
- Tested package artifact, not only source imports.
- No Node.js dependency in the Electron renderer.
- Compatible with Electron context isolation and a restrictive Content Security Policy.

## Test Applications

- Expo application for iOS.
- React Native Web application for browser-based testing.
- Electron application using the React Native Web component.
- Deterministic fixtures shared by component and end-to-end tests.

## Component Tests

- Every role, status, and supported content type.
- Every callback and event payload.
- Disabled, read-only, and capability-controlled actions.
- Composer growth and keyboard behavior.
- Input-method editor composition.
- Partial and malformed Markdown.
- Custom renderers and actions.
- Theme overrides.
- Accessibility roles, names, and states.
- Scroll and visible-anchor calculations.

## Playwright Tests

Playwright runs against the React Native Web and Electron test applications.

- Send using the button and keyboard.
- Add a newline without sending.
- Stream deterministic response chunks.
- Stop before and during a response.
- Retain partial content after Stop.
- Prevent duplicate Send and Stop events.
- Ignore updates from superseded operations.
- Replace the conversation during streaming.
- Render incomplete Markdown during streaming.
- Copy messages and code blocks.
- Retry and regenerate responses.
- Preserve the draft during updates.
- Follow streaming content at the bottom.
- Preserve scroll position while reading earlier content.
- Load earlier messages without moving the visible anchor.
- Grow and internally scroll the composer.
- Exercise long conversations and large Markdown responses.
- Navigate using only the keyboard.
- Verify focus behavior.
- Run automated accessibility checks.
- Verify light, dark, high-contrast, narrow, and wide layouts.
- Verify browser zoom and increased text size.
- Verify raw HTML and unsafe links are not activated.
- Verify custom renderers, controls, actions, themes, and icons.
- Verify renderer failures are isolated.
- Verify Electron context isolation and Content Security Policy compatibility.
- Verify links do not navigate the Electron window automatically.
- Verify the packaged component in each test application.

Playwright visual tests use fixed mobile and desktop viewports. Dynamic timestamps and streaming indicators are frozen for screenshots.

Playwright does not test native iOS views. iOS release checks cover safe areas, software and hardware keyboards, input composition, dynamic type, focus, text selection, composer growth, scrolling, streaming, and Stop behavior.

## Future Features

- File and image attachments.
- Drag-and-drop and paste-to-attach.
- Attachment progress and retry.
- Citations and source previews.
- Tool-call status and approval.
- Multiple response branches.
- Message editing and resubmission.
- Search-result highlighting.
- Voice input and audio messages.
- Read-aloud controls.
- Expandable reasoning or detail sections.
- Application-defined annotations.
- Right-to-left layout.
- Android support.
- Standalone browser support.
