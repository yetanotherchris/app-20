# Tasks: LLMChat Rename and Repository Move

**Input**: Design documents from `/specs/009-llmchat-rename-move/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are not explicitly requested in the spec. All existing tests are moved and must pass, but no new test tasks are generated.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the new repository structure and copy source from the monorepo

- [x] T001 Clone or initialize the new repository at https://github.com/yetanotherchris/app-20-llmchat
- [x] T002 Copy packages/chat/src/ to src/ in the new repository
- [x] T003 Copy packages/chat/tests/ to tests/ in the new repository (if tests exist outside src/)
- [x] T004 Copy packages/chat/tsconfig.json and tsconfig.build.json to repo root
- [x] T005 Copy packages/chat/CHANGELOG.md to repo root
- [x] T006 Copy existing GitHub Actions workflows from .github/workflows/ (if any)
- [x] T007 Copy documentation site source to docs/ directory

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Package metadata and core export structure that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T008 Update package.json: name to "app-20-llmchat", version to "1.0.0", private to false, add repository/homepage/bugs/keywords per data-model.md in package.json
- [x] T009 Update package.json: set main, module, types, exports fields per contracts/npm-package.md in package.json
- [x] T010 Update package.json: add scripts (build, lint, typecheck, test, test:e2e) per contracts/npm-package.md in package.json
- [x] T011 Update package.json: verify peerDependencies and dependencies match spec in package.json
- [x] T012 [P] Add README.md with installation instructions, basic usage example, and link to documentation site in README.md
- [x] T013 [P] Add LICENSE file (MIT) to repo root
- [x] T014 Verify tsconfig.json has strict mode enabled and correct paths in tsconfig.json

**Checkpoint**: Foundation ready - package metadata correct, user story implementation can begin

---

## Phase 3: User Story 1 - Install and Use the Renamed Component (Priority: P1) - MVP

**Goal**: A developer can import `LLMChat` from `app-20-llmchat` and render a chat using dot-notation sub-components

**Independent Test**: Install the package locally, import `LLMChat`, render `<LLMChat.Root><LLMChat.Conversation /><LLMChat.PromptInput /></LLMChat.Root>` and verify it works

### Implementation for User Story 1

- [x] T015 [US1] Rename src/components/Chat.tsx to src/components/LLMChat.Root.tsx and rename exported component from Chat to LLMChatRoot in src/components/LLMChat.Root.tsx
- [x] T016 [US1] Rename src/components/MessageList.tsx to src/components/LLMChat.Conversation.tsx and rename export to LLMChatConversation in src/components/LLMChat.Conversation.tsx
- [x] T017 [US1] Rename src/components/Composer.tsx to src/components/LLMChat.PromptInput.tsx and rename export to LLMChatPromptInput in src/components/LLMChat.PromptInput.tsx
- [x] T018 [US1] Rename src/components/MessageBubble.tsx to src/components/LLMChat.Bubble.tsx and rename export to LLMChatBubble in src/components/LLMChat.Bubble.tsx
- [x] T019 [US1] Rename src/components/MessageStatusBadge.tsx to src/components/LLMChat.Status.tsx and rename export to LLMChatStatus in src/components/LLMChat.Status.tsx
- [x] T020 [P] [US1] Rename src/components/SendButton.tsx to src/components/LLMChat.SendButton.tsx in src/components/LLMChat.SendButton.tsx
- [x] T021 [P] [US1] Rename src/components/StopButton.tsx to src/components/LLMChat.StopButton.tsx in src/components/LLMChat.StopButton.tsx
- [x] T022 [P] [US1] Rename src/components/ScrollToLatestControl.tsx to src/components/LLMChat.ScrollToLatest.tsx in src/components/LLMChat.ScrollToLatest.tsx
- [x] T023 [P] [US1] Rename src/components/LoadEarlierControl.tsx to src/components/LLMChat.LoadEarlier.tsx in src/components/LLMChat.LoadEarlier.tsx
- [x] T024 [P] [US1] Rename src/components/UnreadBadge.tsx to src/components/LLMChat.UnreadBadge.tsx in src/components/LLMChat.UnreadBadge.tsx
- [x] T025 [P] [US1] Rename src/components/EmptyState.tsx to src/components/LLMChat.EmptyState.tsx in src/components/LLMChat.EmptyState.tsx
- [x] T026 [P] [US1] Rename src/components/LoadingState.tsx to src/components/LLMChat.LoadingState.tsx in src/components/LLMChat.LoadingState.tsx
- [x] T027 [P] [US1] Rename src/components/TypingState.tsx to src/components/LLMChat.TypingState.tsx in src/components/LLMChat.TypingState.tsx
- [x] T028 [P] [US1] Rename src/components/ErrorState.tsx to src/components/LLMChat.ErrorState.tsx in src/components/LLMChat.ErrorState.tsx
- [x] T029 [US1] Update all internal imports across renamed components to use new file paths in src/components/
- [x] T030 [US1] Rewrite src/index.ts to export LLMChat namespace object with all sub-components per research.md R2 in src/index.ts
- [x] T031 [US1] Update TypeScript type exports: rename ChatProps to LLMChatRootProps, MessageListProps to LLMChatConversationProps, etc. in src/index.ts
- [x] T032 [US1] Update internal components (ActionMenu, MessageActions, MessageRendererBoundary) to import from renamed files in src/components/
- [x] T033 [US1] Update hooks, rendering, theme, accessibility imports if any reference component files in src/hooks/, src/rendering/, src/theme/, src/accessibility/
- [x] T034 [US1] Run npm run build and verify dist/ output contains correct type definitions in dist/
- [x] T035 [US1] Run npm run typecheck and verify zero errors
- [x] T036 [US1] Run existing unit tests and verify they pass with updated imports in tests/

**Checkpoint**: User Story 1 complete - package installs, imports resolve, component renders with new API

---

## Phase 4: User Story 2 - Migrate from Old API (Priority: P1)

**Goal**: A migration guide exists mapping every old component name to its new dot-notation equivalent

**Independent Test**: Follow the migration guide to convert a working @app-20/chat integration to app-20-llmchat; verify identical behavior

### Implementation for User Story 2

- [x] T037 [US2] Create migration guide document with before/after code examples for all 14 renamed components in docs/content/migration-guide.md
- [x] T038 [US2] Add migration guide section to documentation site navigation in docs/
- [x] T039 [US2] Verify migration guide covers all components from data-model.md Component Export Mapping table in docs/content/migration-guide.md
- [x] T040 [US2] Add common pitfalls section (both packages installed, old import paths, workspace resolution) in docs/content/migration-guide.md

**Checkpoint**: User Story 2 complete - migration guide covers 100% of renamed components with copy-paste ready code

---

## Phase 5: User Story 3 - Access Documentation and Examples (Priority: P1)

**Goal**: Documentation site reflects new names, repository location, and all examples use LLMChat API

**Independent Test**: Navigate to documentation site, verify all examples use LLMChat.Root/Conversation/PromptInput, find migration guide

### Implementation for User Story 3

- [x] T041 [US3] Update quick-start guide to use app-20-llmchat package name and LLMChat API in docs/content/quick-start.md
- [x] T042 [US3] Update all API reference entries to use new component names (LLMChat.Root, LLMChat.Conversation, etc.) in docs/content/api-reference/
- [x] T043 [US3] Update all recipe examples to use LLMChat namespace imports in docs/content/recipes/
- [x] T044 [US3] Remove or update any references to @app-20/chat or old Chat component name across all documentation in docs/
- [x] T045 [US3] Update documentation site configuration (if any) to reflect new repository URL and package name in docs/
- [x] T046 [US3] Verify no references to old package name remain in documentation via grep in docs/

**Checkpoint**: User Story 3 complete - documentation uses LLMChat API exclusively, migration guide accessible

---

## Phase 6: User Story 4 - Publish to npm (Priority: P2)

**Goal**: Package can be published to npm via tag-triggered GitHub Actions workflow

**Independent Test**: Run npm pack and verify tarball contents; push v* tag and verify publish workflow triggers

### Implementation for User Story 4

- [x] T047 [US4] Create CI workflow (.github/workflows/ci.yml) running lint, typecheck, unit tests, e2e tests, and build on push/PR per FR-014 in .github/workflows/ci.yml
- [x] T048 [US4] Create npm publish workflow (.github/workflows/publish.yml) triggered on v* tag, running all checks before npm publish per FR-015/FR-016 in .github/workflows/publish.yml
- [x] T049 [US4] Create documentation deployment workflow (.github/workflows/docs.yml) deploying to GitHub Pages on push to main per FR-017 in .github/workflows/docs.yml
- [x] T050 [US4] Add node_modules and build artifact caching to all workflows per FR-018 in .github/workflows/
- [x] T051 [US4] Verify npm pack produces correct tarball (dist/, README, LICENSE, CHANGELOG only, under 100KB) via npm pack --dry-run
- [x] T052 [US4] Add .npmignore or refine files field to exclude source files and dev artifacts from published package in package.json

**Checkpoint**: User Story 4 complete - package builds, packs, and publish workflow is configured

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup across all user stories

- [x] T053 [P] Run full build pipeline: npm run lint, npm run typecheck, npm run test, npm run build
- [x] T054 [P] Run npm pack and verify tarball contents and size
- [x] T055 [P] Grep entire repository for remaining references to @app-20/chat or old component names (Chat, MessageList, Composer, etc.) in src/, docs/, tests/
- [x] T056 [P] Verify all renamed component files exist with correct names in src/components/
- [x] T057 Verify LLMChat namespace export includes all 14 sub-components in src/index.ts
- [x] T058 Verify TypeScript types are correct with no `any` types in exported surface via npm run typecheck
- [x] T059 Run quickstart.md validation scenarios end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories 1-3 (Phase 3-5)**: All depend on Foundational phase completion
  - US1 (rename components) is the primary work; US2 and US3 can proceed in parallel after US1
  - US2 (migration guide) requires US1 to be complete (needs final component names)
  - US3 (documentation) requires US1 to be complete (needs working examples)
- **User Story 4 (Phase 6)**: Can start after Foundational; workflows reference final package structure
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on US1 completion (migration guide needs final API)
- **User Story 3 (P3)**: Depends on US1 completion (docs need working examples)
- **User Story 4 (P4)**: Can start after Foundational; independent of US1-3 but needs final package structure

### Within Each User Story

- Component renames (T015-T028) can be parallelized
- Import updates (T029-T033) must follow renames
- Build/typecheck/test (T034-T036) must follow all code changes
- Documentation tasks (T037-T046) can be parallelized after US1
- Workflow tasks (T047-T052) can be parallelized

### Parallel Opportunities

- All Setup tasks (T001-T007) can run in parallel
- All Foundational tasks (T008-T014) can run in parallel
- Component rename tasks (T015-T028) marked [P] can run in parallel
- Documentation tasks (T041-T046) can run in parallel
- Workflow tasks (T047-T052) can run in parallel
- Polish tasks (T053-T059) marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all component renames together (different files):
Task: "Rename Chat.tsx to LLMChat.Root.tsx in src/components/"
Task: "Rename MessageList.tsx to LLMChat.Conversation.tsx in src/components/"
Task: "Rename Composer.tsx to LLMChat.PromptInput.tsx in src/components/"
Task: "Rename MessageBubble.tsx to LLMChat.Bubble.tsx in src/components/"
# ... etc for all 14 components

# After renames complete, update imports and exports:
Task: "Update all internal imports in src/components/"
Task: "Rewrite src/index.ts with LLMChat namespace export"
Task: "Update TypeScript type exports"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (clone, copy source)
2. Complete Phase 2: Foundational (package.json, tsconfig, README)
3. Complete Phase 3: User Story 1 (rename 14 components, update exports)
4. **STOP and VALIDATE**: Build, typecheck, test
5. Package is usable locally via npm link

### Incremental Delivery

1. Setup + Foundational - Foundation ready
2. US1 (rename) - Component works with new API - can npm link for testing
3. US2 (migration guide) - Existing users can migrate
4. US3 (documentation) - New users can discover and learn
5. US4 (publish) - Package available on npm

### Parallel Team Strategy

With multiple developers:

1. Developer A: Setup + Foundational + US1 (rename components)
2. Developer B: US4 (CI/CD workflows) - can work in parallel once package.json is stable
3. After US1: Developer A: US2 (migration guide), Developer C: US3 (documentation)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- This is a rename-only feature; no behavioral changes
- All existing tests must pass after rename (Principle V)
- No backward compatibility aliases in v1.0.0 (research.md R6)
- Fresh copy recommended over git history preservation (research.md R3)
