# Implementation Plan: Shared Chat Message Rendering

**Branch**: `spec-002-shared-chat-message-rendering` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-shared-chat-message-rendering/spec.md`

## Summary

Build message rendering for the shared chat component: assistant responses render as formatted Markdown, user prompts as plain text, and system messages with a distinct treatment. Uses `react-native-marked` with a custom `Renderer` subclass that adds a code-block copy control, suppresses remote images, and delegates link activation to the host. Raw HTML is plain text by construction; text is selectable; unsupported content falls back to inert text. Builds on the spec 001 message list and monorepo.

## Technical Context

**Language/Version**: TypeScript strict mode (mandatory per constitution), React 19.2, React Native 0.86 (Expo SDK 57), react-native-web 0.21.

**Primary Dependencies**: `react-native-marked` 8.1.1 (parsing/rendering), `react-native-svg` (peer of react-native-marked, web-capable), plus the existing stack: `@legendapp/list`, Vitest 5, `@testing-library/react` 16 (web tests), Playwright 1.63, Electron (e2e harness).

**Storage**: N/A. Rendering is purely presentational; conversation persistence is spec 101.

**Testing**: Vitest unit suites (web/jsdom via RNW alias) for the renderer and role treatment; Playwright `_electron` e2e for the acceptance scenarios (markdown elements, code copy, role alignment, raw HTML inert, link delegation).

**Target Platform**: iOS (Expo SDK 57), Windows desktop (Electron with RNW renderer).

**Project Type**: Library (shared component package) plus the existing test applications (`apps/web`, `apps/electron`).

**Performance Goals**: A 6 KB Markdown response renders without perceptible freezing (spec SC-002); off-window content is not parsed eagerly (research R5).

**Constraints**: Component must not depend on Node, `fs`, or Electron modules in the renderer (constitution I). React, React Native, React Native Web are peer dependencies. Raw HTML and remote images are disabled by default (constitution technology constraints). The component must never execute code (FR-008).

**Scale/Scope**: Single-user personal chat; messages up to ~1000 words (~6 KB); streaming updates append to a message's content part.

## Constitution Check

Gates from `.specify/memory/constitution.md`:

- **Process Isolation (I)**: Pure renderer; no Node, `fs`, or Electron access. PASS.
- **Path Trust (II)**: No filesystem access in this spec. N/A.
- **No Data Loss (III)**: No saves in this spec. N/A.
- **Fixed and Typed Preload API (IV)**: No IPC changes in this spec; the harness preload stays fixed. PASS.
- **Non-Negotiable Test Coverage (V)**: This spec adds user-visible behaviour; it gets a Playwright e2e suite plus Vitest unit tests. PASS.
- **Technology constraints**: Raw HTML and remote images disabled by default; component never executes code; accessibility per spec 005 later. React Native primitives shared across targets. PASS.

Re-checked after Phase 1 design: no gate violations. The security posture (FR-006/007/008) is structural — the chosen library has no HTML render path — so it cannot regress through configuration.

## Project Structure

### Documentation (this feature)

```text
specs/002-shared-chat-message-rendering/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
packages/chat/
├── src/
│   ├── index.ts                    # Public exports (extended)
│   ├── components/
│   │   ├── MessageList.tsx         # Existing; now consumes richer rows
│   │   └── MessageBubble.tsx       # NEW: role-aligned message row (US2)
│   ├── rendering/                  # NEW: content rendering
│   │   ├── MarkdownText.tsx        # react-native-marked wrapper (US1)
│   │   ├── MarkdownRenderer.ts     # Renderer subclass: copy, images off, links
│   │   ├── CodeBlock.tsx           # Copy control + failure state (US4)
│   │   ├── PlainText.tsx           # Literal plain text for user prompts (FR-003)
│   │   ├── ContentRenderer.tsx     # kind -> renderer map + fallback (FR-009)
│   │   └── roleStyles.ts           # User/assistant/system treatments (US2)
│   └── types.ts                    # Existing; ContentPart extended as needed
├── package.json                    # Add react-native-marked, react-native-svg
└── tsconfig.json

packages/chat-demo/
├── src/
│   ├── ChatDemo.tsx                # Render MessageBubble rows; add fixtures
│   └── fixtures/
│       ├── markdown-suite.md       # Every supported element (SC-001)
│       └── unsafe-markdown.md      # HTML, remote images, javascript: links (US3)

tests/e2e/
├── launch.ts                       # Existing shared helper
└── message-rendering.spec.ts       # NEW: spec 002 acceptance scenarios
```

**Structure Decision**: Extends the existing `packages/chat` package from spec 001. New rendering code lives under `src/rendering/` (one domain), the role-aligned row under `src/components/MessageBubble.tsx`. The demo app gains markdown fixtures for e2e. Unit tests sit beside their source as `*.test.ts(x)`.

## Complexity Tracking

No constitution violations. The only deliberate complexity is the custom `Renderer` subclass in `MarkdownRenderer.ts`: react-native-marked does not expose copy-on-code, image-suppression, or link-delegation as props, so a subclass overrides `code`, `image`, `linkImage`, and `link`. The simpler alternative (the `<Markdown>` component with default behaviour) is rejected because it loads remote images by default and navigates links internally, violating FR-007 and FR-012.