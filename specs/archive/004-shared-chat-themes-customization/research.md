# Research: Shared Chat Themes and Customization

**Date**: 2026-09-07 | **Spec**: 004-shared-chat-themes-customization

## R1: Theme system and the top-level Chat component

**Decision**: Build a semantic-token theme system on React context with plain typed objects, and introduce a top-level `Chat` component that owns the `ThemeProvider` and accepts the full customization surface. No styling library.

**Rationale**: FR-001/002/003 need light/dark/custom themes with token-based styling; SC-001 forbids hardcoded colors on any surface. The existing components use `StyleSheet.create` with literal hex colors scattered across files, so a token layer is required. A context provider is the React-idiomatic way to flow tokens to every surface without threading a `theme` prop through every component. The docs (`docs/react-component-overview.md`) already describe the component as "controlled by the consuming application" with inputs including theme, renderers, actions, capabilities, and states; the top-level `Chat` component is that documented surface. Custom themes merge over a base theme (light or dark) via `DeepPartial` so an unknown or partial token falls back to the default (spec edge case).

**Alternatives considered**: Passing a theme prop into every primitive (verbose, easy to miss a surface, and it pollutes the granular API); adding NativeWind/Tailwind (new runtime dependency and toolchain, no existing usage in this package; the existing code is plain `StyleSheet`); a CSS-variable approach on web only (breaks the shared native/web implementation, FR-016).

## R2: Semantic token shape

**Decision**: A single `ChatTheme` interface of semantic tokens (colors, spacing, radii, typography). Default light and dark themes are exported; a host override is `ThemeInput = DeepPartial<ChatTheme>` merged over the active base theme.

**Rationale**: FR-003 requires semantic tokens. A flat token map with names derived from the surfaces (background, surface, border, text, textSecondary, primary, onPrimary, danger, codeBackground, codeHeader, codeText, userBubble, assistantBubble, systemBubble, unreadBadge, composerSurface, composerInput, sendDisabled, etc.) covers every surface in SC-001. `DeepPartial` gives hosts the "override one token, keep the rest" behavior the spec requires, and the merge is shallow-per-key with fallback to the base so unknown keys cannot break rendering.

**Alternatives considered**: A nested theme of per-component style objects (couples the theme to component internals and makes overrides brittle); CSS-string tokens (not cross-platform).

## R3: Renderer replacement surface (FR-004/005/006)

**Decision**: Three separate override points: (1) the complete message renderer is already `renderMessage` on `MessageList` (FR-004, default `MessageBubble`); (2) `ContentRenderer` gains a `contentRenderers` map keyed by `kind.format` with a fallback to defaults (FR-005); (3) `MarkdownRenderer` (the react-native-marked `Renderer` subclass) delegates each element method through an optional per-element override map before its own default, and `MarkdownText` accepts a fully custom `Renderer` instance (FR-006).

**Rationale**: FR-004 is already satisfied by the existing `renderMessage` prop (spec 001 contract). For FR-005, keying the map by `kind.format` ("text.plain", "text.markdown") gives hosts per-content-type replacement while defaults apply elsewhere (acceptance scenario 2). For FR-006, react-native-marked's `Renderer` is a class with one method per Markdown element (`link`, `code`, `heading`, etc.; verified in `node_modules/react-native-marked/dist/typescript/lib/Renderer.d.ts`), so the cleanest element override is a map consulted before the class default; a fully custom `Renderer` instance is the whole-renderer escape hatch. Both keep the safe invariants (no remote images, no raw HTML execution, links delegate to host) as the base behavior.

**Alternatives considered**: Requiring hosts to subclass `Renderer` for every change (correct but a high barrier for a one-element override); putting the element map only at the `MarkdownText` level (leaks parser details into the public API).

## R4: Isolating a throwing custom renderer (FR-011, SC-004)

**Decision**: Wrap each message row's rendering in a per-message error boundary keyed by message id. When a custom renderer throws for a message, the boundary for that row catches it and falls back to the default renderer for that message; other rows are untouched.

**Rationale**: React does not catch render-phase errors in a parent without an error boundary. FR-011 requires that a custom renderer throwing for one message does not break the list and that other messages continue. A single boundary around the whole list would take down the entire conversation; a boundary per message (keyed by `message.id`) isolates the failure to exactly that row. The fallback renders the default `MessageBubble` for the failed message.

**Alternatives considered**: try/catch around `renderMessage` in the list render (cannot catch errors thrown during React's render commit); one boundary around the list (too coarse, violates FR-011); letting the error propagate (violates FR-011).

## R5: Control replacement and custom-composer-controls (FR-007, FR-013)

**Decision**: `Chat` accepts render props `renderSend`, `renderStop`, `renderScrollToLatest`, and `renderComposerControls`. Each receives the same props the default control receives (labels, disabled state, callbacks, stable `testID`). The composer and list render the custom control in place of the default.

**Rationale**: Render props give hosts a typed, low-ceremony replacement surface and keep the `testID`s stable for the acceptance tests (custom controls must still be findable). A custom Send control must not remove the Stop affordance during a submission (spec edge case): the composer renders Stop independently of the Send override, driven by the busy state, so replacing Send alone cannot hide Stop. Composer controls (FR-013) render as a group before/after Send/Stop, wired to the host's callbacks.

**Alternatives considered**: Component-type props like `sendControl={MySend}` (works but forces hosts to lift all wiring into their component; render props are more explicit); a generic "controls" registry (over-engineered for five named controls).

## R6: Replaceable state views (FR-008, US3)

**Decision**: The list's state area is driven by a `status` prop (`idle | submitting | streaming | stopping | error`, the chat status shape referenced from spec 006) plus the message count. `Chat` renders `renderEmptyState`/`renderLoadingState`/`renderTypingState`/`renderErrorState` (or defaults) in the right conditions: empty when no messages and idle, loading while a response is being requested, typing while an assistant response is being composed, error when the error status is active.

**Rationale**: Spec 006 owns the exact chat status set; this spec consumes that shape to drive which replaceable view shows. Default state components ship so the component is usable with no customization (SC-003), and hosts replace any of them (FR-008). The typing state is defined as an "assistant is composing" indicator (user decision in planning), distinct from loading which covers "response requested, nothing received yet".

**Alternatives considered**: Deferring all states to spec 006 (leaves US3 acceptance scenarios untestable here); inventing a new status set (conflicts with spec 006's shape).

## R7: Message actions with grouping and availability (FR-009)

**Decision**: `Chat` accepts `messageActions` as a list of `MessageAction` (`{ id, label, group, available?, onAction }`). `MessageBubble` shows an action affordance (a "More" control) that opens a grouped menu. Actions render under their group label; activating one fires `onAction(action, message)`. If the host supplies no actions, no affordance renders (spec edge case).

**Rationale**: FR-009 requires grouping, availability, and message context. Grouping is a field on the action so the host decides buckets; availability is a predicate (or per-action boolean) so actions can be hidden per message; the callback carries both the action and the message as context. The "More" affordance appears only when at least one action is available for the message, so removing all actions leaves no affordance.

**Alternatives considered**: A single flat list with no grouping (violates FR-009); grouping by message role implicitly (host must own grouping).

## R8: Icons (FR-010)

**Decision**: Controls render a small default icon set (text glyphs: Send arrow, Stop square, scroll-to-latest chevron, More ellipsis, copy) supplied through an `icons` map. When the host supplies an icon for a named slot, the default is not rendered.

**Rationale**: The acceptance scenario requires that supplying custom icons means no default icon appears, which implies defaults exist. Text glyphs (unicode) render on both web and native without react-native-svg, which is web-stubbed and can render nothing (verified in `packages/chat/src/vite/stubs/react-native-svg.tsx`). The `icons` map is keyed by stable names (`send`, `stop`, `scrollToLatest`, `more`, `copy`) so hosts replace exactly the slots they want.

**Alternatives considered**: SVG-based defaults (react-native-svg renders nothing on web, breaking SC-001 and the icon acceptance scenario); no defaults (makes the "no default icon appears" scenario vacuous).

## R9: Packaging and packaged-artifact testing (FR-015)

**Decision**: Add a `tsconfig.build.json` and a `build` script to `packages/chat` that emits ESM + TypeScript declarations to `dist/` via `tsc`. Set package `main`, `types`, and `exports` to the `dist` entry, move react/react-native/react-native-web to `peerDependencies`, add a `files` allowlist, and add a CHANGELOG. A separate vitest project (`vitest.package.config.ts`) imports the built `dist/index.js` (not `src`) and runs a smoke suite over the public surface; `npm run test:e2e` builds the Electron harness, which consumes the package through its exports, so the packaged artifact is what the e2e exercises.

**Rationale**: FR-015 requires a versioned package consumable by both hosts and tests that exercise the packaged artifact, not only source imports. The Electron e2e already builds and runs the real app, so pointing the workspace's `@app-20/chat` resolution at the built entry makes the acceptance tests run against the artifact. The vitest package project guarantees the artifact exports the documented surface even outside the Electron harness.

**Alternatives considered**: Publishing raw TypeScript source as the entry (no declarations build, fails "tested packaged artifact" and the versioned-package requirement); a bundler like tsup/rollup for the library build (adds a build-time dependency and configuration; `tsc` alone emits ESM + `.d.ts` sufficient for a dependency-light component).

## R10: Class overrides (FR-003)

**Decision**: Themed components accept a per-surface `style` override that is applied after the token-derived base style, so the override wins on conflict. This is the cross-platform "class override" channel for this component.

**Rationale**: FR-003 requires styling to use semantic tokens and support class overrides. Verified empirically against the installed react-native-web 0.21.2 (T001 gate): `View` and `Text` do not forward a `className` prop at all (it is dropped before `createDOMProps`), and `unstable_createElement` overwrites a host-supplied `className` with RNW's generated class whenever a `style` prop is present. So a literal `className` channel is not available on web without breaking the shared implementation. RN's own override idiom is the `style` prop array (`[base, override]`, later wins); react-native-web compiles that into CSS classes internally, so a per-surface style override is the faithful cross-platform equivalent of a class override. Every themed surface exposes a `styleOverrides[surface]` slot on `Chat`, applied on both hosts.

**Alternatives considered**: A web-only `className` map (rejected: RNW 0.21.2 drops it, verified by probe test); relying only on semantic tokens with no override channel (fails FR-003).