# Feature Specification: LLMChat Rename and Repository Move

**Feature Branch**: `spec-009-llmchat-rename-move`

**Created**: 2026-09-09

**Status**: Draft

**Input**: User request: "I want to rename the React component to LLMChat and move it to a new repository. The new repo is https://github.com/yetanotherchris/app-20-llmchat. The component should follow React naming conventions with dot notation for sub-components."

## Scope

This feature specifies the rename and relocation of the shared chat component from `@app-20/chat` to `LLMChat`, following React component library naming conventions (Radix/Chakra dot notation). The component moves from the current monorepo to a dedicated repository at https://github.com/yetanotherchris/app-20-llmchat. The rename establishes a clear identity as an LLM conversation interface, distinguishing it from person-to-person messaging components.

The rename updates the component's public API to use dot notation for sub-components (e.g., `LLMChat.Root`, `LLMChat.Conversation`, `LLMChat.PromptInput`). The repository move establishes the component as a standalone, publishable package suitable for npm distribution.

### In Scope

- Renaming the package from `@app-20/chat` to `app-20-llmchat` (npm)
- Renaming the main export from `Chat` to `LLMChat`
- Renaming sub-components to follow dot notation convention:
  - `Chat` → `LLMChat.Root`
  - `MessageList` → `LLMChat.Conversation`
  - `Composer` → `LLMChat.PromptInput`
  - `MessageBubble` → `LLMChat.Bubble`
  - `MessageStatusBadge` → `LLMChat.Status`
  - `SendButton` → `LLMChat.SendButton`
  - `StopButton` → `LLMChat.StopButton`
  - `ScrollToLatestControl` → `LLMChat.ScrollToLatest`
  - `LoadEarlierControl` → `LLMChat.LoadEarlier`
  - `UnreadBadge` → `LLMChat.UnreadBadge`
  - `EmptyState` → `LLMChat.EmptyState`
  - `LoadingState` → `LLMChat.LoadingState`
  - `TypingState` → `LLMChat.TypingState`
  - `ErrorState` → `LLMChat.ErrorState`
- Moving component source to https://github.com/yetanotherchris/app-20-llmchat
- Moving documentation site source to the new repository
- Moving all test files (unit tests, e2e tests) to the new repository
- Moving GitHub Actions workflows to the new repository:
  - CI workflow (lint, typecheck, test, build)
  - npm publish workflow (triggered on release or tag)
  - Documentation deployment workflow (GitHub Pages)
- Configuring GitHub Actions for npm publication:
  - Run lint, typecheck, and tests before publish
  - Build the package
  - Publish to npm on tag or release
- Updating all imports, documentation, examples, and tests
- Configuring npm package metadata for publication
- Updating the documentation site to reflect new names and repository

### Out of Scope

- Changing component behavior or adding new features
- Renaming internal/private components or hooks
- Changing the component's React Native primitives or platform support
- Modifying the component's theming system or accessibility features
- Setting up npm organization or access permissions (assumed configured)
- Adding new CI/CD features beyond publish workflow (e.g., preview deployments)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Install and Use the Renamed Component (Priority: P1)

A developer installs the renamed package and uses the new dot notation API to render an LLM chat interface.

**Why this priority**: The primary goal is a working renamed component that follows React conventions.

**Independent Test**: Install the package from npm (or local path), import `LLMChat`, and render a basic chat with the new API.

**Acceptance Scenarios**:

1. **Given** the renamed package, **When** a developer imports `LLMChat` from `app-20-llmchat`, **Then** the import resolves and `LLMChat.Root`, `LLMChat.Conversation`, `LLMChat.PromptInput` are available.
2. **Given** the new API, **When** a developer renders `<LLMChat.Root><LLMChat.Conversation /><LLMChat.PromptInput /></LLMChat.Root>`, **Then** the chat interface renders with the same appearance and behavior as the previous `Chat` component.
3. **Given** the renamed package, **When** a developer checks the package.json, **Then** the name is `app-20-llmchat`, the version is `1.0.0`, and the description reflects LLM chat UI.

### User Story 2 - Migrate from Old API (Priority: P1)

A developer using `@app-20/chat` migrates to `app-20-llmchat` by updating imports and component names.

**Why this priority**: Existing users need a clear migration path.

**Independent Test**: Take a working integration using `@app-20/chat`, update imports to `app-20-llmchat`, rename components, and verify the chat works identically.

**Acceptance Scenarios**:

1. **Given** a working integration using `@app-20/chat`, **When** the developer updates the import to `app-20-llmchat` and renames `Chat` to `LLMChat.Root`, **Then** the chat renders and functions identically.
2. **Given** the migration, **When** the developer updates `Composer` to `LLMChat.PromptInput` and `MessageList` to `LLMChat.Conversation`, **Then** all props and behavior remain the same.
3. **Given** the migration guide, **When** followed, **Then** the developer can complete the migration in under 10 minutes for a typical integration.

### User Story 3 - Access Documentation and Examples (Priority: P1)

A developer finds the component's documentation, examples, and API reference at the new repository.

**Why this priority**: Documentation must reflect the new names and repository location.

**Independent Test**: Navigate to the documentation site, verify all examples use `LLMChat` API, and find the migration guide.

**Acceptance Scenarios**:

1. **Given** the documentation site, **When** a developer visits, **Then** all examples use `LLMChat.Root`, `LLMChat.Conversation`, `LLMChat.PromptInput` and other renamed components.
2. **Given** the migration section, **When** a developer reads it, **Then** it lists every renamed component with old and new names and provides copy-paste ready code.
3. **Given** the quick-start, **When** followed, **Then** it uses the new `app-20-llmchat` package name and `LLMChat` API.

### User Story 4 - Publish to npm (Priority: P2)

A maintainer publishes the renamed package to npm for public consumption.

**Why this priority**: npm publication makes the component available to the React ecosystem.

**Independent Test**: Run `npm publish` and verify the package appears on npm with correct metadata.

**Acceptance Scenarios**:

1. **Given** the package.json, **When** reviewed, **Then** it contains correct name, version, description, main/module/types fields, peer dependencies, and repository URL.
2. **Given** the build output, **When** `npm pack` is run, **Then** the tarball contains dist/, README.md, LICENSE, and CHANGELOG.md with no source files or dev artifacts.
3. **Given** the published package, **When** installed via `npm install app-20-llmchat`, **Then** the package resolves correctly and exports `LLMChat` with all sub-components.

### Edge Cases

- A developer has both `@app-20/chat` and `app-20-llmchat` installed; the packages must not conflict.
- The documentation site URL changes; old links should redirect or 404 gracefully.
- A developer uses the old import path; the error message should guide them to the new path.
- The component is used in a monorepo with workspace references; the move should not break workspace resolution.
- TypeScript types must reflect the new names exactly; no `any` or loose types from the rename.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The package MUST be renamed from `@app-20/chat` to `app-20-llmchat`.
- **FR-002**: The main export MUST be renamed from `Chat` to `LLMChat`, with sub-components accessible via dot notation (e.g., `LLMChat.Root`, `LLMChat.Conversation`).
- **FR-003**: Sub-component renames MUST follow the mapping defined in Scope; no sub-component may be renamed to a name that conflicts with React, React Native, or common library names.
- **FR-004**: The component source MUST be moved to the repository at https://github.com/yetanotherchris/app-20-llmchat, preserving git history where possible (via `git filter-branch` or `git subtree`).
- **FR-005**: All imports in documentation, examples, tests, and demo applications MUST be updated to use the new package name and `LLMChat` API.
- **FR-006**: The package.json MUST be updated with correct name, version (1.0.0), description, repository URL, homepage, bugs URL, keywords, and peer dependencies.
- **FR-007**: A migration guide MUST be provided listing every renamed component with old and new names, example code before and after, and common pitfalls.
- **FR-008**: TypeScript type definitions MUST reflect the new names; no legacy type aliases or `any` types may be introduced by the rename.
- **FR-009**: The documentation site MUST be updated to use the new `LLMChat` API in all examples, quick-start, recipes, and reference entries.
- **FR-010**: The package MUST build successfully with `npm run build` and produce correct dist/ output with type definitions.
- **FR-011**: The package MUST pass `npm pack` validation with no warnings about missing files or incorrect metadata.
- **FR-012**: Backward compatibility aliases MAY be provided for a deprecation period, but MUST NOT be the primary API.
- **FR-013**: All test files (unit tests, e2e tests) MUST be moved to the new repository and pass in the new location.
- **FR-014**: A CI workflow MUST be configured to run lint, typecheck, unit tests, and e2e tests on every push and pull request.
- **FR-015**: A publish workflow MUST be configured to publish to npm when a tag matching `v*` is pushed, after running all tests and build.
- **FR-016**: The publish workflow MUST run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` before publishing.
- **FR-017**: A documentation deployment workflow MUST be configured to deploy the docs site to GitHub Pages on push to main.
- **FR-018**: The GitHub Actions workflows MUST use appropriate caching for node_modules and build artifacts.

### Key Entities *(include if feature involves data)*

- **Package**: The npm package containing the component, identified by name and version.
- **Component**: The main `LLMChat` export and its sub-components.
- **Repository**: The GitHub repository at https://github.com/yetanotherchris/app-20-llmchat.
- **Documentation Site**: The GitHub Pages site documenting the component.
- **Migration Guide**: The document mapping old API to new API.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The package `app-20-llmchat` is published to npm and installable without errors.
- **SC-002**: A developer can install `app-20-llmchat`, import `LLMChat`, and render a basic chat in under 5 minutes following the quick-start.
- **SC-003**: All documentation examples use the new `LLMChat` API; no references to `@app-20/chat` or `Chat` component remain in documentation.
- **SC-004**: The migration guide covers 100% of renamed components with before/after code examples.
- **SC-005**: TypeScript types are correct; no `any` types or loose types exist in the published package.
- **SC-006**: `npm pack` produces a tarball under 100KB (excluding source maps) with only dist/, README, LICENSE, and CHANGELOG.
- **SC-007**: The repository at https://github.com/yetanotherchris/app-20-llmchat contains the component source, documentation source, tests, and build configuration.
- **SC-008**: The CI workflow runs lint, typecheck, unit tests, and e2e tests on every push and pull request.
- **SC-009**: The publish workflow publishes to npm when a `v*` tag is pushed, after all tests pass.
- **SC-010**: The documentation deployment workflow deploys to GitHub Pages on push to main.

## Assumptions

- The new repository https://github.com/yetanotherchris/app-20-llmchat already exists with boilerplate README, gitignore, and license.
- The component's behavior does not change; only names and package metadata are modified.
- npm publication is the target distribution method; no other registries are in scope.
- The documentation site will be hosted on GitHub Pages, consistent with the existing setup.
- Git history preservation is desirable but not mandatory; a clean import is acceptable if history preservation is too complex.
- The component's peer dependencies (react, react-native, react-native-web) remain unchanged.

## Dependencies and Requirement Changes

- This specification depends on the component defined in specs 001-007 (message list, rendering, composer, themes, accessibility, streaming, reference presentation).
- The rename does not change any functional requirements from specs 001-007; it only changes the public API surface names.
- The documentation spec (008) must be updated to reflect the new names and repository location.
- No other specs are affected by this rename.
