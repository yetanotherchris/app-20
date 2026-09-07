# Theme Contract

**Date**: 2026-09-07 | **Spec**: 004-shared-chat-themes-customization

## ChatTheme

The semantic token set consumed by every themed surface. A flat object of typed tokens; see `data-model.md` for the full token list.

```ts
export interface ChatTheme {
  colors: {
    background: string
    surface: string
    border: string
    text: string
    textSecondary: string
    primary: string
    onPrimary: string
    danger: string
    codeBackground: string
    codeHeader: string
    codeText: string
    userBubble: string
    assistantBubble: string
    systemBubble: string
    unreadBadge: string
    composerSurface: string
    composerInput: string
    composerBorder: string
    sendDisabled: string
    controlSurface: string
  }
  radii: {
    bubbleRadius: number
    composerRadius: number
    controlRadius: number
  }
  spacing: {
    bubbleMarginH: number
    bubbleMarginV: number
    composerPaddingH: number
    composerPaddingV: number
  }
  typography: {
    messageTextSize: number
    composerTextSize: number
    controlTextSize: number
    captionTextSize: number
  }
}

export type ThemeInput = DeepPartial<ChatTheme>
export type ThemeName = 'light' | 'dark' | 'system'
```

## Defaults

`light` and `dark` themes are exported from `themes.ts`. Their values are the current hardcoded palette (light) and a dark equivalent derived from the same tokens, both expressed entirely in tokens so SC-001 holds.

## Resolution

`resolveTheme(name, override)` returns the active theme:

1. Base is `light` or `dark` (when `name === 'system'`, the host reads `useColorScheme` and picks the matching base; web falls back to light).
2. Each present key in `override` replaces the base value.
3. Absent keys keep the base value.

Unknown keys are not expressible in the type and are ignored at runtime via a shallow merge over known token groups. A partial override therefore never breaks rendering (spec edge case).

## Surfaces and override channels

`SurfaceName` names the themed surfaces: `messageList`, `messageBubble`, `composer`, `composerInput`, `send`, `stop`, `scrollToLatest`, `loadEarlier`, `unreadBadge`, `codeBlock`, `empty`, `loading`, `typing`, `error`, `actionMenu`.

Each surface accepts, through `Chat`, a `styleOverrides[surface]` style override applied after the token-derived style (cross-platform; react-native-web compiles it into CSS classes on web). The token-derived style is always the base; the override wins on conflict (FR-003). A literal `className` prop is not used: react-native-web 0.21.2 does not forward it (research R10).