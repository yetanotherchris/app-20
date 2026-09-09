# Implementation Plan: LLMChat Rename and Repository Move

**Branch**: `spec-009-llmchat-rename-move` | **Date**: 2026-09-09 | **Spec**: `specs/009-llmchat-rename-move/spec.md`

**Input**: Feature specification from `/specs/009-llmchat-rename-move/spec.md`

## Summary

Rename the shared chat component from `@app-20/chat` to `app-20-llmchat` (npm package name), change the main export from `Chat` to `LLMChat` with dot-notation sub-components, and move the component source, tests, documentation, and CI/CD to a dedicated repository at https://github.com/yetanotherchris/app-20-llmchat. The component behavior does not change; only public API surface names and package metadata are modified.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: React 19, React Native 0.86, React Native Web 0.21 (peer deps); `@legendapp/list`, `react-native-marked`, `react-native-svg` (direct deps)

**Storage**: N/A (component library, no persistence)

**Testing**: Vitest for unit tests, Playwright for e2e tests

**Target Platform**: Web (React Native Web) + iOS (React Native)

**Project Type**: React component library (npm package)

**Performance Goals**: N/A (rename only, no behavioral changes)

**Constraints**: TypeScript strict mode; `any` forbidden at IPC boundary (N/A for library); WCAG 2.2 AA accessibility output

**Scale/Scope**: 15 sub-components, ~30 source files, ~20 test files, 1 documentation site

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applicable? | Status |
|-----------|-------------|--------|
| I. Process Isolation | No | Component library; no Electron/renderer boundary |
| II. Path Trust | No | No file system operations in component |
| III. No Data Loss | No | No persistence or saves in component |
| IV. Fixed and Typed Preload API | No | No IPC boundary; library only |
| V. Non-Negotiable Test Coverage | Yes | All existing tests must pass after rename |

**Gate Result**: PASS. The rename is purely a public API surface change. Constitution principles I-IV do not apply to a standalone component library. Principle V requires that all tests pass post-rename, which is enforced by the task workflow.

## Project Structure

### Documentation (this feature)

```text
specs/009-llmchat-rename-move/
├── spec.md
├── plan.md
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (not created by plan)
```

### Source Code (target repository: app-20-llmchat)

```text
src/
├── components/
│   ├── LLMChat.tsx              # Main composite (was Chat.tsx)
│   ├── LLMChat.Conversation.tsx # Was MessageList.tsx
│   ├── LLMChat.PromptInput.tsx  # Was Composer.tsx
│   ├── LLMChat.Bubble.tsx       # Was MessageBubble.tsx
│   ├── LLMChat.Status.tsx       # Was MessageStatusBadge.tsx
│   ├── LLMChat.SendButton.tsx
│   ├── LLMChat.StopButton.tsx
│   ├── LLMChat.ScrollToLatest.tsx
│   ├── LLMChat.LoadEarlier.tsx
│   ├── LLMChat.UnreadBadge.tsx
│   ├── LLMChat.EmptyState.tsx
│   ├── LLMChat.LoadingState.tsx
│   ├── LLMChat.TypingState.tsx
│   ├── LLMChat.ErrorState.tsx
│   └── [internal: ActionMenu, MessageActions, MessageRendererBoundary, etc.]
├── hooks/
├── rendering/
├── theme/
├── accessibility/
├── session/
├── types.ts
├── icons.ts
└── index.ts                     # LLMChat namespace export

tests/
├── unit/
├── integration/
└── e2e/

docs/                            # Documentation site source
├── content/
│   ├── quick-start.md
│   ├── migration-guide.md
│   ├── api-reference/
│   └── recipes/
└── [doc site config]

.github/workflows/
├── ci.yml                       # lint, typecheck, test, build
├── publish.yml                  # npm publish on v* tag
└── docs.yml                     # GitHub Pages deploy
```

**Structure Decision**: The component retains its existing internal file organization (components, hooks, rendering, theme, accessibility, session). File names change only for the renamed public components. Internal files (ActionMenu, MessageActions, etc.) keep their names since they are not part of the public API. The documentation site moves alongside the component.

## Complexity Tracking

No constitution violations to justify. The rename is a straightforward public API surface change with no behavioral modifications.
