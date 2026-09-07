# Implementation Plan: Shared Chat Themes and Customization

**Branch**: `spec-004-shared-chat-themes-customization` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-shared-chat-themes-customization/spec.md`

## Summary

Give the shared chat component a customization surface: semantic-token themes (light, dark, system, and host overrides), replaceable renderers (message, content, Markdown element), replaceable controls (Send, Stop, scroll-to-latest), replaceable state views (empty, loading, typing, error), message actions with grouping and availability, composer controls, application icons, and disabled/read-only/capability constraints. A new top-level `Chat` component owns the theme context and accepts every customization prop, while the existing primitives stay exported. The deliverable is a versioned package whose packaged artifact is exercised by automated tests, not only source imports.

## Technical Context

**Language/Version**: TypeScript strict mode (mandatory per constitution), React 19.2, React Native 0.86 (Expo SDK 57), react-native-web 0.21.

**Primary Dependencies**: Existing stack only: `@legendapp/list`, `react-native-marked`, `react-native-svg` (web stub), Vitest 5, `@testing-library/react` 16 (web tests), Playwright 1.63, Electron (e2e harness). No new runtime dependency. The theme system uses React context and typed plain objects; no styling library is introduced.

**Storage**: N/A. The component remains presentational; hosts own messages, draft, status, and callbacks.

**Testing**: Vitest unit suites (web/jsdom via RNW alias) for theme resolution, renderer delegation, renderer-failure fallback, control replacement, action grouping, state views, and constraint states. A packaged-artifact vitest project imports `dist/` (not `src/`) and exercises the public surface. Playwright `_electron` e2e for the acceptance scenarios.

**Target Platform**: iOS (Expo SDK 57), Windows desktop (Electron with RNW renderer). One implementation serves both (FR-016); host differences enter only through the documented props.

**Project Type**: Library (shared component package) plus the existing test applications (`apps/web`, `apps/electron`) and the demo host (`packages/chat-demo`).

**Performance Goals**: Theme switch and renderer replacement must not remount the message list or reset scroll (US1-A3); a custom renderer that throws must not take down the list (FR-011, SC-004); no per-keystroke O(n) work introduced.

**Constraints**: No Node, `fs`, or Electron in the renderer (constitution I). React, React Native, React Native Web stay peer dependencies. The component must render on web without react-native-svg (web stub, FR-007). Customization is additive; with no customization the component is fully usable (SC-003).

**Scale/Scope**: Single-user personal chat; one response in flight (beta). Customization is per-host, not per-brand; multi-brand theming is out of scope (spec assumptions).

## Constitution Check

Gates from `.specify/memory/constitution.md`:

- **Process Isolation (I)**: Pure renderer; no Node, `fs`, or Electron access. Custom renderers and controls are host-supplied React components; nothing in the customization surface touches privileged APIs. PASS.
- **Path Trust (II)**: No filesystem access in this spec. N/A.
- **No Data Loss (III)**: No saves. Theme switches and renderer replacement never discard messages, draft, or stream state; a failing renderer falls back per message (FR-011) and other messages continue. PASS.
- **Fixed and Typed Preload API (IV)**: No IPC changes; the harness preload stays fixed. The customization surface is typed props, never a generic escape hatch. PASS.
- **Non-Negotiable Test Coverage (V)**: This spec adds user-visible behavior; it gets a Playwright e2e suite, Vitest unit suites, and a packaged-artifact test (FR-015). PASS.
- **Technology constraints**: Accessibility is spec 005; this spec keeps accessible names and touch targets intact while replacing controls. Semantic tokens plus class overrides (FR-003) are implemented as typed theme tokens plus per-surface style overrides (react-native-web 0.21.2 does not forward a `className` prop, research R10/T001). PASS.

Re-checked after Phase 1 design: no gate violations. The one deliberate complexity is the per-message error boundary that isolates a throwing custom renderer (research R4); the simpler alternative (let the throw propagate) is rejected because it violates FR-011.

## Project Structure

### Documentation (this feature)

```text
specs/004-shared-chat-themes-customization/
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
│   ├── theme/
│   │   ├── types.ts                # NEW: ChatTheme tokens, ThemeInput (DeepPartial)
│   │   ├── themes.ts               # NEW: default light + dark themes
│   │   ├── ThemeContext.tsx        # NEW: ThemeProvider + useTheme
│   │   └── resolveTheme.ts         # NEW: merge override over active base, fallback on unknown
│   ├── components/
│   │   ├── Chat.tsx                # NEW: top-level customization surface (US1-4)
│   │   ├── MessageList.tsx         # Edit: token styles, renderScrollToLatest, style overrides
│   │   ├── MessageBubble.tsx       # Edit: actions menu, content renderers, icons, token styles
│   │   ├── Composer.tsx            # Edit: token styles, renderSend/renderStop, composer controls, disabled/readOnly
│   │   ├── SendButton.tsx          # Edit: token styles, icon slot
│   │   ├── StopButton.tsx          # Edit: token styles, icon slot
│   │   ├── ScrollToLatestControl.tsx # Edit: token styles, icon slot
│   │   ├── LoadEarlierControl.tsx  # Edit: token styles
│   │   ├── UnreadBadge.tsx         # Edit: token styles
│   │   ├── ActionMenu.tsx          # NEW: grouped message action menu (US2)
│   │   ├── MessageRendererBoundary.tsx # NEW: per-message error boundary (FR-011)
│   │   ├── EmptyState.tsx          # NEW: default empty view (US3)
│   │   ├── LoadingState.tsx        # NEW: default loading view (US3)
│   │   ├── TypingState.tsx         # NEW: default typing view (US3)
│   │   └── ErrorState.tsx          # NEW: default error view (US3)
│   ├── rendering/
│   │   ├── ContentRenderer.tsx     # Edit: contentRenderers override map (FR-005)
│   │   ├── MarkdownRenderer.tsx    # Edit: element override delegation (FR-006)
│   │   ├── MarkdownText.tsx        # Edit: accept markdownRenderer / element overrides
│   │   └── roleStyles.ts           # Edit: token-driven treatments
│   ├── hooks/                      # (existing, unchanged)
│   └── icons.ts                    # NEW: default text-glyph icons + IconName map (FR-010)
├── tsconfig.build.json             # NEW: tsc emit ESM + declarations to dist/ (FR-015)
├── package.json                    # Edit: build, exports, version, files (FR-015)
└── CHANGELOG.md                    # NEW: versioned changelog (FR-015)

packages/chat-demo/
├── src/
│   ├── ChatDemo.tsx                # Edit: mount Chat; theme/customization toggle controls
│   └── fixtures/                   # (existing)
│   └── customizations/             # NEW: demo custom renderers, controls, actions, icons, states

tests/e2e/
├── launch.ts                       # Existing shared helper
└── themes-customization.spec.ts    # NEW: spec 004 acceptance scenarios

vitest.package.config.ts            # NEW: packaged-artifact vitest project (FR-015)
vitest.package.setup.ts             # NEW: packaged-artifact setup (RNW + svg alias)
```

**Structure Decision**: Extends the existing `packages/chat` package. A new `theme/` module owns tokens, defaults, and the provider. A new top-level `Chat` component (research R1) composes the existing `MessageList` and `Composer`, owns the theme context, and accepts every customization prop; it is the primary host entry point, while the primitives stay exported for granular hosts. Customization state (active theme, renderers, controls, actions, icons, constraints) flows down through props and context, never through forks (FR-016). Unit tests sit beside their source. The packaged-artifact test runs against `dist/` per FR-015.

## Complexity Tracking

No constitution violations. The deliberate complexities, each with the simpler alternative rejected, are recorded in research.md: the per-message error boundary (R4), the theme-context renderer/control delegation (R1/R5), and the packaged-artifact build (R9).