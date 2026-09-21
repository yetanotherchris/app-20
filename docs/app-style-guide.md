# Application Style Guide

## Purpose and ownership

This guide defines the shared visual language for application-owned iOS and desktop interfaces. Use semantic roles rather than local color values or screen-specific visual rules. A new or changed interface that introduces an uncovered role or pattern must add the relevant rule to this guide before implementation is accepted.

The initial implementation alignment under spec 117 is the chat latest control. It uses the `surfaceGrouped`, `borderDefault`, and `textPrimary` roles, a 44 by 44 target, a circular shape, a centered down-arrow icon, and the accessible label "Scroll to latest message".

## Semantic colors

The baseline values below are the light appearance values. Implementations may map a role to an accessible platform semantic color when the result preserves the role's meaning and contrast.

| Role | Baseline value | Use |
|---|---:|---|
| `surfaceCanvas` | `#FFFFFF` | Primary application background, chat transcript, and standard field cells. |
| `surfaceGrouped` | `#F2F2F7` | Grouped page backgrounds, selected-control backgrounds, and secondary circular controls. |
| `surfaceComposer` | `#FAFAFA` | Composer and input containers that sit above `surfaceCanvas`. |
| `surfaceSelected` | `#E9E9ED` | Selected list rows and selected non-destructive content. |
| `textPrimary` | `#111111` | Primary text and high-emphasis icons. |
| `textSecondary` | `#6B6B70` | Supporting labels, placeholders, and helper text. |
| `borderDefault` | `#D1D1D6` | Control boundaries, grouped-card edges, and separators. |
| `actionPrimary` | `#007AFF` | Enabled primary actions, links, active controls, and focus borders. |
| `controlDisabledFill` | `#E5E5EA` | Disabled filled controls. |
| `controlDisabledText` | `#8E8E93` | Disabled text and icons. |
| `feedbackSuccessFill` | `#EAF3FF` | Successful completion feedback. |
| `feedbackSuccessText` | `#0055B3` | Text and icons on success feedback. |
| `feedbackInfoFill` | `#EAF3FF` | Informational notices and non-error setup guidance. |
| `feedbackInfoText` | `#0055B3` | Text and icons on informational feedback. |
| `feedbackWarningFill` | `#FFF6E5` | Warnings that do not block the current task. |
| `feedbackWarningText` | `#8A5700` | Text and icons on warning feedback. |
| `feedbackErrorFill` | `#FFF1F0` | Inline error backgrounds and failed-operation banners. |
| `feedbackErrorText` | `#C62828` | Error text, icons, and custom destructive actions. |
| `overlayScrim` | `#000000` at 30% | Fallback dimming behind application-owned modal surfaces. |

Color never carries state or feedback meaning alone. Pair it with text, an icon, a control state, or another accessible non-color indicator.

## Typography and layout

Use the platform system typeface: San Francisco on iOS and the operating-system UI font on desktop. Font sizes and line heights scale together. Do not use fixed text container heights that clip scaled content.

| Role | Default size / weight / line height | Use |
|---|---:|---|
| `titleLarge` | 28 / 700 / 34 | Drawer and major page titles. |
| `title` | 22 / 500 / 28 | Empty-state titles and prominent section content. |
| `titleCompact` | 17 / 600 / 22 | Sheet titles and compact headers. |
| `body` | 17 / 400 / 22 | Messages, field values, composer input, and row labels. |
| `label` | 15 / 600 / 20 | Section and group headings. |
| `supporting` | 13 / 400 / 18 | Field labels, helper text, banners, and status text. |

| Token | Value | Use |
|---|---:|---|
| `space1` | 4 | Tight internal gap. |
| `space2` | 8 | Related-control gap. |
| `space3` | 12 | Compact padding and feedback inset. |
| `space4` | 16 | Standard screen padding and primary control inset. |
| `space5` | 24 | Section separation. |
| `space6` | 32 | Major content separation. |
| `radiusSmall` | 12 | Fields, cards, and feedback banners. |
| `radiusMedium` | 14 | List rows. |
| `radiusLarge` | 22 | Circular 44-point controls. |
| `radiusPill` | 28 | Composer and wide pill controls. |

Use a 1-point `borderDefault` border for bounded controls and grouped cards. Default application-owned elevated controls use a restrained black shadow at 4% opacity, offset `(0, 2)`, blur radius 8. The floating latest control may use 10% opacity with the same offset and blur. Do not add gradients or decorative glass effects. Native menus, sheets, alerts, and system materials retain system elevation.

Icons use a 24 by 24 view box, `currentColor`, and 2-point rounded strokes unless a pattern defines another size. Icons are decorative when adjacent text fully names the action. Icon-only controls require an accessible label. Interactive bounds are at least 44 by 44 points on iOS and 44 by 44 CSS pixels on desktop; larger bounds are allowed when text scaling requires them.

## Control states

Apply the following states to each applicable button, icon button, field, list row, and feedback action. Preserve layout between states unless content growth is necessary.

| State | Presentation |
|---|---|
| Normal | Uses the control's standard surface, border, text, and icon roles. |
| Focused | Shows a visible `actionPrimary` focus indicator. A field uses a 1-point action border unless error is present. Desktop keyboard focus remains visible after pointer interaction. |
| Pressed | Shows immediate surface or opacity feedback without changing the action's meaning. Desktop may use hover in addition to pressed feedback; iOS does not require hover. |
| Disabled | Uses `controlDisabledFill` and `controlDisabledText` when filled, prevents activation, and exposes disabled state to assistive technology. |
| Selected | Uses `surfaceSelected` and a semantic selected value. Do not rely on a checkmark alone where selection is otherwise unclear. |
| Loading | Preserves the control's location, prevents conflicting repeat actions, exposes busy state, and uses a native spinner with concise text where the operation's scope is not otherwise clear. |
| Success | Uses the success roles with text or a labeled confirmation icon. Success must describe the completed operation. |
| Error | Uses error roles, an error icon or text, and actionable recovery where retry is available. Error styling takes precedence over focused styling. |

## Shared patterns

### Navigation and headers

Navigation groups related destinations and keeps the current location selected. Headers keep the page title and its primary actions visible without competing with conversation content. Header icon buttons use circular or platform-native presentation, 44 by 44 targets, 24-point icons, and accessible labels. Long titles truncate visually only when their full value remains available to assistive technology.

### Chat and composer

Conversation content uses `surfaceCanvas`, `body`, and readable message hierarchy. User prompts are visually distinct from assistant responses without reducing assistant text contrast. Message actions are secondary, adjacent to the message they affect, and retain 44 by 44 targets. The latest control floats above the transcript and never overlaps the composer, keyboard, or message actions.

The composer is a contained input pattern using `surfaceComposer`, a border, `radiusPill`, and `space4` internal padding. It keeps text above its action row when the two-row pattern is used. Send remains available only for a non-whitespace draft with a configured available model and required configuration. During a send, preserve draft text until the result is known, expose busy state, and prevent duplicate sends.

### Messages and lists

Messages preserve reading order, author distinction, timestamps where present, and clear pending or failed state. A failed message or operation includes text that explains the failure and a retry action when supported.

Lists use consistent row padding, 44-point minimum interactive targets, a selected-row treatment, and a visible loading, empty, or error replacement for the list region. Destructive list actions require a confirmation pattern before the irreversible action. List row menus use native menus when available.

### Forms

Forms group related fields in bordered cards with `radiusSmall`. A field presents a label, value, helper, and inline error in reading order. Validation appears near the affected field, uses text in addition to `feedbackErrorText`, and does not erase the user's draft. Required fields and optional fields are named explicitly. Sensitive values remain masked by default and are never repeated in feedback.

### Feedback, empty, and loading states

Feedback banners use `space3` padding, `radiusSmall`, and the applicable semantic feedback roles. They state what happened, whether the user can continue, and the recovery action when available. Empty states explain the absent content and offer one relevant next action when one exists. Loading states replace only the unavailable region, use a native spinner and concise label, and do not block unrelated usable controls.

### Destructive confirmation

Destructive actions use `feedbackErrorText` or the platform destructive semantic role and require a confirmation surface that names the affected item and consequence. The cancel action is non-destructive and has a clear default focus. Native system confirmation dialogs are preferred; their native appearance is not restyled.

## Platform parity and variation

Equivalent iOS and desktop roles use the same semantic color roles, typography roles, spacing scale, state meanings, feedback language, and accessibility outcomes. Values can adapt to platform semantic colors and dynamic environment settings when the role remains equivalent.

| Area | iOS | Desktop |
|---|---|---|
| Navigation | Native presentation, safe-area layout, and touch-first targets. | Persistent or window-oriented navigation may be used where space permits; keyboard navigation is always available. |
| Menus, sheets, alerts, keyboard | Use native menus, sheets, alerts, keyboard, and system dimming. | Use desktop menus, dialogs, focus management, and pointer interactions. |
| Hover and focus | Pressed and focused states; hover is not required. | Hover may preview interactivity but never replaces visible keyboard focus. |
| Typography | San Francisco and Dynamic Type. | System UI font and operating-system text scaling. |
| Pointer and touch targets | Minimum 44 by 44 points. | Minimum 44 by 44 CSS pixels; pointer hit area may exceed the visible control. |

## Accessibility

Meet WCAG 2.2 AA contrast for text, icons that convey meaning, focus indicators, and control boundaries. Respect operating-system text scaling and reflow content instead of clipping it. At large text sizes, rows, headers, and controls grow vertically; horizontal controls may wrap or stack while preserving action order.

Every interactive control has a programmatic name, role, and state. Icon-only controls have concise labels. Decorative icons are hidden from assistive technology. Focus moves into an application-owned modal on open and returns to its invoker on close. Background content is unavailable to assistive technology while a modal is open. Announce concise loading, success, error, selected, disabled, and edit-mode changes without interrupting passive message reading.

Reduce Motion replaces non-essential movement with a short crossfade or no animation. Loading uses native indicators rather than shimmer or decorative motion. Do not communicate status only through color, animation, position, or an icon without text.

## Relationship to the iOS chat visual specification

`specs/ios-chat-design/visual-spec.md` is an input to this guide. Its shared decisions are consolidated here as semantic roles, type and layout scales, state rules, patterns, and accessibility outcomes. The iOS specification remains the detailed source for chat-specific geometry, copy, state scenarios, and iOS-native behavior.

When the two documents overlap, this guide defines shared cross-platform meaning and the iOS visual specification defines iOS chat-specific detail. Amend this guide first when changing a shared role or pattern, then update the iOS specification when its concrete chat detail changes. Do not create a conflicting local role or state meaning in either document.
