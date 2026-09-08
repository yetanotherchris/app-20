# Research: Shared Chat Reference Presentation

**Date**: 2026-09-08 | **Spec**: 007-chat-reference-presentation

## R1: Reference measurements and the layout token group

**Decision**: Record the reference panel measurements as the durable source for FR-002 and encode them as a new `layout` token group on `ChatTheme`: `readingColumnWidth` (540), `composerWidth` (650), `sidePadding` (16). The MessageList renders its rows inside a centered column capped at `readingColumnWidth`; the Composer renders its pill inside a centered row capped at `composerWidth`; both add `sidePadding` on the outside so narrow panels shrink to fit (FR-002, US4-A1).

**Rationale**: The supplied image (approximately 1191 by 638 pixels) has a 217-pixel drawer excluded, leaving a main panel of about 974 by 638. Within it, the assistant text spans x=432..973 and the composer x=384..1031. Rebased to the main panel origin these are: reading column left 215, right edge 756 (about 541 wide, centered within 3 px), composer left 167, right 814 (about 647 wide, centered within 4 px). The spec's FR-002 tolerances (10% width, 8 px centering) absorb the image-scale uncertainty, so the token defaults are 540 and 650 with an 8-pixel side padding. The component sizes against its own available panel, not the window or an assumed drawer (FR-001), so both widths are `maxWidth` caps with `width: '100%'`; they shrink on narrow panels instead of overflowing (FR-002).

**Alternatives considered**: Fixed pixel widths (breaks narrow panels); percentage widths (cannot hit the FR-002 absolute reference values); leaving the list full-width and only adding side margins (no defined reading column).

## R2: Reference typography and the typography token extensions

**Decision**: Record the reference type choices and extend `ChatThemeTypography` so body and control type are token-driven (FR-014): `messageTextSize: 16`, `messageLineHeight: 24`, `messageWeight: '400'`; `composerTextSize: 16`, `composerLineHeight: 24`; `controlTextSize: 14`, `controlLineHeight: 20`, `controlWeight: '500'`; `captionTextSize: 12`, `captionLineHeight: 16`, `captionWeight: '600'`; `headingWeight: '600'`. Sizes and line heights repeat per theme so dark, high-contrast, and enlarged-text settings can scale them; weights are identical across themes. The component does not set a `fontFamily`: the reference face (Söhne) is proprietary and unavailable, and React Native accepts a single family name, so the default is the platform sans-serif.

**Rationale**: FR-004 requires a readable regular-weight sans-serif body with consistent line spacing, and FR-014 requires body and control typography to follow semantic tokens across light, dark, high-contrast, and enlarged-text settings. The reference body is approximately 16 px regular at line height 1.5, controls approximately 14 px, captions 12 px. Recording the values here is the planning step FR-004/FR-014 mandate; they are applied as theme defaults, and hosts override them through the existing `themeOverride` channel.

**Alternatives considered**: Hardcoding sizes in components (violates FR-014 and SC-001); a CSS font-family stack (React Native does not accept a font stack, and the reference face is not redistributable); keeping the current 14 px body (does not match the reference reading size).

## R3: Markdown paragraph spacing and visible hierarchy

**Decision**: Drive paragraph spacing through react-native-marked's `MarkedStyles.paragraph` in `MarkdownText`, using a new `spacing.paragraphGap` token (default 8). Stop flattening every element onto the body text style: give headings scaled sizes and `headingWeight`, `strong` an explicit bold weight, `em` an italic style, and inline code a monospace face on a subtle `systemBubble`-derived chip. `paragraphGap` and the `bubbleMarginV` turn gap (R6) are separate, so gaps between turns exceed gaps between lines (FR-004, US1-A4).

**Rationale**: The current `MarkdownText` passes the flattened body style to `h1..h6`, `strong`, and `em`, which makes headings and emphasis indistinguishable from body text (verified in `packages/chat/src/rendering/MarkdownText.tsx`). react-native-marked's `MarkedStyles` (verified in `node_modules/react-native-marked/dist/typescript/theme/types.d.ts`) exposes `paragraph`, `h1..h6`, `strong`, `em`, and `codespan` keys, so the fix is token-driven styles passed to `useMarkdown`, not a renderer change. Code blocks keep their existing surface (CodeBlock) and must not become an enclosing response card (US1-A4).

**Alternatives considered**: Overriding `paragraph` through `MarkdownElementRenderers` (works but splits one presentation concern across two override layers); letting the base library defaults apply (they are not token-driven and do not follow the theme, violating SC-001).

## R4: User bubble presentation

**Decision**: Default user messages become content-sized, right-aligned, light-gray rounded bubbles with no tail and dark readable text, capped at the reading column width (FR-003, US1-A2). New `userBubbleText` color token holds the bubble text color per theme (light `#0f172a` on `#ececec`, dark `#f1f5f9` on `#343536`, high contrast white-on-black and black-on-white). The old "tail" corner (`borderTopRightRadius: 4`) is removed; all four corners use `radii.bubbleRadius` (18 in the light and dark themes). The blue `onPrimary` text on the blue `userBubble` from spec 004 is replaced by this treatment.

**Rationale**: The reference shows right-aligned light-gray user bubbles with dark text and no tail (spec observations and SC-001 visual check 2). A dedicated `userBubbleText` token keeps the text on the bubble contrast-assertable (research R10) and lets hosts re-tint the bubble without losing readable text.

**Alternatives considered**: Reusing `onPrimary` (white on gray fails contrast); reusing `text` (breaks the high-contrast black-bubble case, where the bubble text must be white).

## R5: Assistant unboxed presentation

**Decision**: Default assistant messages render text directly on the canvas: no background, no border, no radius, no padding, no avatar, and no repeated role heading, left-aligned within the reading column (FR-003, US1-A3). `roleStyles` is restructured so the shared base style no longer applies a background, radius, or padding to every role: the user treatment carries the bubble surface, the assistant treatment carries none, and the system treatment keeps its existing stretch treatment. The `assistantBubble` color token remains in the type for hosts who re-introduce a bubble via `styleOverrides` or a custom theme.

**Rationale**: The reference (and the spec's deliberate override of the spec-001 overview's "left-aligned bubbles") renders assistant responses as page text, not chat bubbles. Code-specific surfaces (CodeBlock) keep their own styling and do not wrap the response in a card (US1-A4). Message role stays accessible through the existing row label and markup even though no visual role chip is shown.

**Alternatives considered**: Keeping a transparent bubble view (same DOM, but a residue of bubble semantics); removing the `assistantBubble` token (hosts and spec 004 customization would lose a documented token).

## R6: Reading-column centering and turn spacing

**Decision**: `MessageList` renders its rows inside a centered column: an outer full-width surface (background token), a `sidePadding` wrapper, and an inner column with `width: '100%'`, `maxWidth: readingColumnWidth`, and `alignSelf: 'center'`. `roleStyles` sets `marginVertical` from `spacing.bubbleMarginV` and `maxWidth: '100%'` so bubbles and text wrap within the column. The default `bubbleMarginV` rises from 4 to 12 (24 px between turns), and `bubbleMarginH` falls to 0 (the column owns the horizontal rhythm; user bubbles end at the column's right edge and assistant text starts at its left edge, matching the reference).

**Rationale**: FR-001/FR-002 require the conversation to be centered and width-constrained with whitespace on both sides and no reserved drawer gutter. The turn gap must exceed the line gap (FR-004); with `bubbleMarginV: 12` a turn pair is 24 px apart while paragraphs inside a response are `paragraphGap` (8 px) apart. The scroll-to-latest and unread overlay stays inside the list surface, above the composer, without covering its input or controls (US3-A4, FR-008).

**Alternatives considered**: Applying the max width to each bubble instead of a column (correct but re-does the centering for every row and leaves the scrollbar at full panel width); adding inner padding to the column (would shrink the usable 540 px).

**Refinement (visual review 2026-09-08)**: The list now spans the full panel so the scrollbar sits at the panel edge (browser scrollbar); each row centers its content in the reading column instead of wrapping the whole virtualized list. The scroll-to-latest and unread overlay is horizontally centered above the composer. The reference 540/650 widths and centering are unchanged.

## R7: Composer pill

**Decision**: Restructure the Composer so its default form is a centered pill: a full-width container with `sidePadding`, `alignItems: 'center'`, transparent background, and no top border, holding a pill view with `width: '100%'`, `maxWidth: composerWidth`, `composerSurface` background, `composerRadius` (24 in the light and dark themes), a 1 px `composerBorder` outline, and a subtle shadow. The `TextInput` becomes borderless and transparent inside the pill; Send/Stop and host composer controls render inside the pill at its right end, aligned to the bottom (`alignItems: 'flex-end'`). The pill grows upward under the existing autogrow cap and then scrolls internally (FR-005, US2-A3); with no host composer controls no plus or microphone space is reserved (US2-A6).

**Rationale**: The reference composer is a rounded, single-form pill wider than the reading column, containing the input and the circular Send at its right end, with a white surface, thin neutral outline, and subtle shadow (US2-A1). Making the pill the container keeps the send/stop control inside the form, matching the reference, while preserving all existing input, autogrow, submit, and stop behavior (FR-010).

**Alternatives considered**: Keeping the input as the only pill and floating Send outside (does not match the reference placement); moving Send outside the pill via absolute positioning (fragile with autogrow).

**Refinement (visual review 2026-09-08)**: The pill row is vertically centered so the single-line text, Send, and its arrow share one center line; the input's `paddingVertical` centers its single-line text within the minimum height. By explicit product direction, the composer input has no focus indicator in any theme, including high contrast. This is a temporary accessibility exception recorded in spec.md Clarifications and plan.md Complexity Tracking. A `composerBottomGap` spacing token (16) provides clearance between the pill and the panel bottom, and an empty draft resets the pill to its single-line height after a send.

## R8: Circular Send and the shared Stop area

**Decision**: The default Send is a circular, icon-only control at the composer's right end with `accessibilityLabel` from the send label (default "Send"), a visible up-arrow glyph, a new `sendBackground` color token, and a size of `max(minTouchTarget, 34)` so it is never below the accessibility minimum (FR-006, US2-A2). The label text is not rendered; the accessible name carries it. Stop renders in the same circular control area (same size and surface) with its square glyph and its existing accessible name, so the swap does not change the composer's width or lose the draft (US2-A4). Disabled Send uses the existing `sendDisabled` token.

**Rationale**: FR-006 names a circular upward-arrow Send with the accessible name "Send" and distinct enabled/disabled/focused states, and US2-A4 requires a distinguishable Stop in the same right-end area without a width change. `sendBackground` (light `#0f172a`, dark `#ffffff`, high-contrast matching) reproduces the reference's dark circle on light theme while `onPrimary` supplies the arrow contrast (asserted in R10).

**Alternatives considered**: Keeping the rectangular labeled button (does not match the reference or FR-006's shape); text label plus arrow (the reference is icon-only; the label stays as the accessible name).

**Refinement (review 2026-09-08)**: A paired `sendForeground` color token carries the arrow/square glyph color so a host override of `sendBackground` cannot silently break the glyph contrast; the shipped themes pair `sendForeground` with `sendBackground` in the same way `onPrimary` pairs with `primary`, and the contrast test asserts the new pair.

## R9: Message actions as an inline row

**Decision**: Default message actions render as a compact, left-aligned row of small buttons beneath assistant content (FR-007, US3-A1), replacing the "More" overflow menu as the default presentation. A new `MessageActions` component filters actions by availability (same rules as `ActionMenu`), renders each available action as a `Pressable` labeled with its text, left-aligned below the message, with per-action `testID` `chat.action.<id>`, touch-target minimums, and a visible focus ring. Grouping, availability predicates, context, and host customization are unchanged; with no available actions nothing renders, and the reference's share/plus/microphone controls are absent. `ActionMenu` stays exported for hosts that prefer the menu presentation.

**Rationale**: US3-A1 requires compact neutral action controls below the response, aligned to its left edge, reachable by keyboard and touch without hover; FR-007 requires them to be a row rather than a menu trigger. The `MessageAction` data model from spec 004 is untouched; only the default presentation changes. Reusing the per-action testID keeps the streaming/retry/regenerate/copy e2e flows stable (they already address `chat.action.<id>` after opening the menu; with the row they address the same id directly).

**Alternatives considered**: Restyling `ActionMenu` into a row (couples the menu's modal logic to the row presentation); rendering group labels in the row (the reference has no group headings, and grouping remains available in `ActionMenu`).

## R10: Reference palette and contrast regression

**Decision**: Record the reference light palette and apply it as theme defaults: canvas `background` `#ffffff`, `userBubble` `#ececec`, `userBubbleText` `#0f172a`, `composerBorder` `#d9d9e3`, `sendBackground` `#0f172a`, `composerSurface` `#ffffff`. Dark equivalents: `userBubble` `#343536`, `userBubbleText` `#f1f5f9`, `sendBackground` `#ffffff`, `composerBorder` `#3f3f46`. High-contrast themes keep maximal surfaces (black/white). The contrast unit test extends its asserted pairs with `userBubbleText`/`userBubble` and `onPrimary`/`sendBackground` (both at the 4.5:1 normal-text minimum), and updates the `text`/`surface` pair for the new white canvas.

**Rationale**: FR-004 requires recording color choices during planning rather than inferring them in code, and SC-001 names the white canvas and gray bubbles as visual checks. The R5 contrast test in spec 005 is the regression gate for readability; the new surfaces must be added to it so a future token edit cannot silently break the new bubble or send control.

**Alternatives considered**: Reusing `primary` for Send (a blue circle does not match the reference and conflates link and control colors); leaving the old `#f8fafc` canvas (fails the "white canvas" check).

## R11: Prior e2e presentation assertions

**Decision**: The default-presentation change intentionally supersedes prior rendering assertions in `tests/e2e`. The light canvas assertion in `themes-customization.spec.ts` changes from `rgb(248, 250, 252)` to `rgb(255, 255, 255)`; the action flows in `themes-customization.spec.ts`, `streaming-operations.spec.ts`, and `accessibility.spec.ts` switch from opening `chat.action-menu` to clicking the inline `chat.action.<id>` buttons directly. Behavior (copy, retry, regenerate, stop, send, states, constraints) is unchanged; only the selectors and one canvas color change.

**Rationale**: FR-007 and the spec's "Dependencies and Requirement Changes" section explicitly replace the overflow-menu presentation and the left-aligned assistant bubble with the reference row and unboxed text. The archived specs' e2e suites encode the old presentation; keeping them would assert against the new default and fail. The behavior assertions survive, so the suites continue to guard the spec 001-006 semantics.

**Alternatives considered**: Preserving the overflow menu as the default and styling it (contradicts FR-007's row requirement); keeping the old canvas color (fails SC-001).

## R12: Responsive behavior and safe areas

**Decision**: Narrow panels, 200% zoom, and enlarged text are handled by the flex layout plus the `sidePadding` wrapper and `width: '100%'`/`maxWidth` combination: ordinary text and the composer never overflow the panel, message alignment stays distinct, and the composer stays reachable (US4-A1/A3, FR-015). e2e covers a 390 px viewport and 200% zoom by asserting no panel-wide horizontal overflow. On-screen keyboard avoidance and device safe areas remain host responsibilities: the shared component is presentational, this repository's harness cannot exercise a mobile keyboard, and the component does not depend on `react-native-safe-area-context` (the composer's bottom padding uses theme tokens so hosts can add safe-area insets through `styleOverrides`).

**Rationale**: FR-015 and US4-A1/A2 require mobile usability, but the shared component has no mobile harness in this repository. Recording the host boundary is the honest scope: the component guarantees reflow and reachability within its own frame, and hosts wrap it for keyboard and safe-area insets. The demo and e2e validate what the harness can: narrow widths, zoom, theme, and contrast.

**Alternatives considered**: Pulling in `react-native-safe-area-context` (new runtime dependency, no existing usage, and safe-area values are host-owned); building keyboard avoidance into the component (the host owns the keyboard presentation, and the reference is a desktop screenshot).
