# Data Model: Shared Chat Message Rendering

**Date**: 2026-09-07 | **Spec**: 002-shared-chat-message-rendering

## Entities

### ContentPart (extended from spec 001)

Spec 001 defines `ContentPart` with `kind: 'text'`, `format: 'plain' | 'markdown'`, and `text`. This spec assigns rendering behaviour to that shape.

| Field | Type | Rendering |
|---|---|---|
| `kind` | `'text'` | Initial content type. |
| `format` | `'plain' \| 'markdown'` | `plain` renders through `PlainText` (no parsing); `markdown` renders through `MarkdownText`. |
| `text` | `string` | The content. |

Future kinds (attachments, images, tool calls) add a value to the closed `kind` union; until a renderer exists for them, the fallback renderer shows inert text (FR-009).

### Message role treatments

| Role | Alignment | Treatment |
|---|---|---|
| `user` | right | Distinct user bubble style. |
| `assistant` | left | Distinct assistant bubble style. |
| `system` | left (or full-width) | Non-conversational, distinct style (FR-004). |

## Renderer mapping

| Content part | Renderer |
|---|---|
| `{ kind: 'text', format: 'plain' }` | `PlainText` |
| `{ kind: 'text', format: 'markdown' }` | `MarkdownText` |
| unknown kind | `FallbackRenderer` (inert plain text of the part) |

## Renderer contract inputs

`MarkdownRenderer` (the react-native-marked subclass) configures:

- `code(text, language)` — wraps the fenced block with `CodeBlock`, which shows a copy control.
- `image` / `linkImage` — render nothing (remote images not loaded, FR-007).
- `link(children, href)` — call `onLinkPress(href)`; never navigate internally (FR-012).
- `html(text)` — default (plain `<Text>`), so raw HTML is literal text (FR-006).

## Copy attempt state

| State | Meaning |
|---|---|
| `idle` | No copy in progress. |
| `copied` | Copy succeeded; control shows a brief confirmation. |
| `failed` | Copy failed (e.g. clipboard denied); control shows a visible failure state (FR-004/acceptance). |

`copied` and `failed` are transient, reset on the next copy attempt or after a short timeout.