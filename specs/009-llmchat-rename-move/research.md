# Research: LLMChat Rename and Repository Move

**Date**: 2026-09-09

## R1: npm Package Naming Conventions

**Decision**: Use `app-20-llmchat` as the npm package name (no scope).

**Rationale**: The spec defines this name explicitly. Scoped packages (`@app-20/llmchat`) would conflict with the existing `@app-20/chat` if both are installed during migration. An unscoped name avoids scope-availability issues and is simpler for public consumption.

**Alternatives considered**:
- `@app-20/llmchat`: Rejected because it ties to the old org scope and could confuse users migrating from `@app-20/chat`.
- `@llmchat/react`: Rejected because the spec hardcodes `app-20-llmchat`.

## R2: React Dot-Notation Component Pattern

**Decision**: Export `LLMChat` as a namespace object with sub-component properties (`LLMChat.Root`, `LLMChat.Conversation`, etc.).

**Rationale**: This follows the Radix/Chakra pattern referenced in the spec. TypeScript supports this via a namespace-style export or a plain object with typed properties.

**Alternatives considered**:
- Individual named exports (`LLMChatRoot`, `LLMChatConversation`): Rejected by spec (dot notation required).
- `LLMChat.Root` as a separate file from `LLMChat`: Works, but the spec requires the dot-notation import shape.

**Implementation approach**:
```typescript
// index.ts
import { LLMChatRoot } from './components/LLMChat.Root'
// ... other imports
export const LLMChat = {
  Root: LLMChatRoot,
  Conversation: LLMChatConversation,
  PromptInput: LLMChatPromptInput,
  // ... etc
}
export type { ... } from './types'
```

## R3: Git History Preservation

**Decision**: Use `git subtree` or a fresh import with `git log` reference.

**Rationale**: The spec says history preservation is "desirable but not mandatory; a clean import is acceptable if history preservation is too complex." `git filter-branch` or `git subtree split` can extract `packages/chat/` history into the new repo, but this is fragile with monorepo structures.

**Alternatives considered**:
- `git subtree split -P packages/chat`: Works but may lose cross-package commit context.
- Fresh copy with squash commit: Simpler, preserves no history.
- `git filter-repo` (modern replacement for `filter-branch`): More robust but requires Python and careful setup.

**Recommendation**: Start with a fresh copy. If the user wants history, attempt `git subtree split` as a follow-up.

## R4: Documentation Site Hosting

**Decision**: GitHub Pages at `https://yetanotherchris.github.io/app-20-llmchat`.

**Rationale**: The spec says GitHub Pages, consistent with existing setup. The new repo can use the same doc site framework (likely a static site generator or Docusaurus/VitePress).

**Alternatives considered**: None; spec is explicit.

## R5: npm Publication Setup

**Decision**: Tag-triggered publish workflow using GitHub Actions.

**Rationale**: The spec requires publishing on `v*` tag push. This is a standard pattern:
1. Push a `v1.0.0` tag
2. GitHub Actions triggers publish workflow
3. Workflow runs lint, typecheck, tests, build
4. Publishes to npm

**Key details**:
- Package must set `"private": false` (currently `"private": true`)
- Need `NPM_TOKEN` secret in the repository
- `npm publish --access public` for unscoped package

## R6: Backward Compatibility Aliases

**Decision**: The spec says aliases "MAY be provided for a deprecation period, but MUST NOT be the primary API."

**Recommendation**: Do not provide aliases in v1.0.0. The old `@app-20/chat` package is `private: true` and never published to npm, so there are no external consumers to alias. The rename is a clean break.

If aliases are desired later, they can be added as a separate task:
```typescript
// Deprecated aliases - remove in v2.0.0
export const Chat = LLMChat.Root
export const MessageList = LLMChat.Conversation
// etc.
```

## R7: TypeScript Type Export Pattern

**Decision**: Export all renamed types alongside the component namespace.

**Rationale**: The spec requires TypeScript types to reflect new names exactly. The current `index.ts` exports types like `ChatProps`, `MessageListProps`, etc. These must become `LLMChatRootProps`, `LLMChatConversationProps`, etc., or be accessible via `LLMChat.RootProps` pattern.

**Implementation approach**:
```typescript
export type { LLMChatRootProps, LLMChatConversationProps, ... } from './types'
// Or via namespace:
export type LLMChatProps = { Root: LLMChatRootProps; ... }
```
