# Research: Shared Chat Message Rendering

**Date**: 2026-09-07 | **Spec**: 002-shared-chat-message-rendering

## R1: Markdown library

**Decision**: `react-native-marked` 8.1.1, using its `useMarkdown` hook, with a custom `Renderer` subclass for the code-block copy control, image suppression, and host link delegation.

**Rationale**: Raw HTML is not a supported element in react-native-marked — the `html()` renderer emits a plain `<Text>` — so "HTML never renders as markup" (FR-006) and "nothing executes" (FR-008) are structural invariants of the library, not configuration that could be mis-set. It is actively maintained (powered by marked 18), `selectable` text is the default (FR-005, FR-010), and fenced code blocks already render inside a horizontal scroll view. The `useMarkdown` hook returns the element array directly, so each message row owns its parse and the message list stays the single virtualization boundary (no nested virtualized list, which the `<Markdown>` component's internal FlatList would create). Custom behaviour (copy control, no remote images, host link delegation) is added by subclassing the exported `Renderer`.

**Alternatives considered**:
- `@ronradtke/react-native-marked-display` 9.0.3 (maintained TypeScript fork of the dead `react-native-markdown-display`): ships `onCopyCode`, tables, and streaming-safe parsing, and renders a plain tree with no inner list. Rejected as primary because raw-HTML-safety depends on markdown-it's `html:false` default (configurable, so a future change could regress FR-006), and iOS text selection is not on by default, requiring per-rule `selectable` overrides. Kept as the fallback if react-native-marked's RNW path fails validation.
- `react-native-markdown-display` (iamacup, the overview doc's initial candidate): unmaintained since Dec 2023; README says "no longer actively maintained". Rejected.
- `react-native-enriched-markdown` (Software Mansion): Fabric text view on native (no replaceable component tree, so no per-code-block copy button); web path renders semantic DOM HTML with default image loading. Rejected.
- `react-native-nitro-markdown` (JSI/md4c): fast, chat-oriented, but no web or Expo Go support. Rejected.

**Risks**: No RNW CI claim exists for react-native-marked; it renders RN core components plus `react-native-svg` (which has an official web compatibility layer). The deciding test is running it in the Electron + RNW harness early (task T002), matching the overview doc's "subject to React Native Web validation" requirement. Fallback is the RonRadtke fork.

**Validation result (task T002, 2026-09-07)**: react-native-marked renders correctly in the Electron + RNW harness. react-native-svg needed a Metro-style `.web` resolution plugin in the Vite configs (`packages/chat/src/vite/web-platform-resolution.ts`): its web entry still imports `./elements` (not `./elements.web`), which only Metro resolves to the web variant; without the plugin Vite bundles the Fabric entry that imports `react-native/Libraries/...` modules react-native-web does not provide. With the plugin, the Fabric path is excluded from the bundle and no page errors occur.

**Source**: npm registry; github.com/gmsgowtham/react-native-marked (README, src/lib/Renderer.tsx, src/lib/types.ts, src/lib/Markdown.tsx); github.com/RonRadtke/react-native-marked-display; github.com/software-mansion-labs/react-native-enriched-markdown; github.com/iamacup/react-native-markdown-display; github.com/software-mansion/react-native-svg.

## R2: HTML and image handling

**Decision**: No sanitizer, because react-native-marked has no HTML render path — HTML tokens become literal text by construction. Remote images are suppressed by overriding the renderer's `image` and `linkImage` methods to render nothing, so no network fetch is attempted.

**Rationale**: A sanitizer is a defense that must be kept current; an absent HTML path needs no updates. FR-006 (raw HTML never markup) and FR-007 (remote images not loaded) hold structurally. `javascript:` links and inline event handlers are inert because the renderer never creates a DOM element or executes an attribute.

**Alternatives considered**: markdown-it-based libraries with `html:false` (configurable, could regress); a sanitize-allowlist on the parsed AST (extra surface, no benefit when no HTML path exists).

## R3: Host link delegation

**Decision**: The custom `Renderer` overrides `link` to invoke an `onLinkPress(href)` callback provided by the host; the component never calls `Linking.openURL` and never navigates internally.

**Rationale**: FR-012 requires navigation delegated to the host. react-native-marked's default `link` handler calls `Linking.openURL` (src/utils/handlers.ts), so the override replaces it entirely rather than augmenting it.

## R4: Code block copy control

**Decision**: The custom `Renderer` overrides `code` to render a fenced code block with a copy control in the row header. Activation calls `onCopyCode(code, language)`; the copy attempt goes through the host's clipboard API, and a failed copy (denied clipboard access) surfaces a visible failure state.

**Rationale**: FR-005 requires selectable, horizontally scrollable code with a copy control. Code is already selectable and horizontally scrollable in react-native-marked; the copy control is the only addition, which a renderer override provides without touching the library.

**Note**: Clipboard access and its denial handling are delegated to the host via `onCopyCode`, matching the component's controlled design; the failure state is rendered by the copy control when the host reports the attempt failed.

## R5: Lazy parsing in the virtualized list

**Decision**: Each message row owns its parse via `useMemo(() => parse(content), [message.id, content, ...])`, and rows are memoized so unrelated list updates do not re-render them. User-role prompts route to a plain `<Text>` and never enter the parser (FR-003).

**Rationale**: The virtualized message list (spec 001) unmounts rows outside the render window, so an off-window message is never mounted and never parsed. Routing by content type before parsing and memoizing per-row parses ensure only rendered content is parsed, satisfying FR-011's "content outside the rendered window is not parsed eagerly" (spec 001) and the 6 KB render budget (FR-011 of this spec).

**Source**: reactnative.dev/docs/virtualizedlist; reactnative.dev/docs/optimizing-flatlist-configuration.

## R6: Role visual treatment

**Decision**: User, assistant, and system roles get distinct styles: user prompts right-aligned with a user treatment, assistant responses left-aligned with an assistant treatment, and system messages in a distinct non-conversational treatment (FR-004).

**Rationale**: Matches the spec's default alignment and the product's chat conventions. Styles are supplied through the component's theme surface so later specs (004 themes) can override them.

## R7: Fallback renderer

**Decision**: Content parts carry a typed `kind`; the component maps each kind to a renderer, and any kind without a registered renderer renders through a fallback that shows inert plain text of the part.

**Rationale**: FR-009 requires unsupported content to render through a fallback rather than breaking the list. The message model already types content parts (spec 001's `ContentPart`), so the renderer map keys on `kind` and falls back by default.