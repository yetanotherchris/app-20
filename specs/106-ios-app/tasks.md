# Tasks: iOS App

**Input**: Planning artifacts in `specs/106-ios-app/`

## Phase 0: Prerequisites

- [ ] T001 Confirm specs 107 and 108 are merged to `main`, rebase `spec-106-ios-app`, and verify their session interfaces support iOS. This task blocks all implementation work.

## Phase 1: Expo Foundation

- [ ] T002 Create `apps/ios` with Expo configuration, strict TypeScript, safe-area root, and EAS internal-distribution configuration.
- [ ] T003 Install native dependencies with Expo-compatible versions and prove a development EAS iOS build succeeds before adding host behavior.
- [ ] T004 Add the root iOS scripts and workspace references required for typecheck, tests, and EAS builds.

## Phase 2: Native Services

- [ ] T005 Implement and unit-test the sandboxed atomic `ConversationFilePort` adapter.
- [ ] T006 Implement and unit-test document-picker imports, validation, and secure storage for provider and S3 credentials without exposing plaintext to UI state.
- [ ] T007 Implement and unit-test the OpenRouter streaming client using the secure provider-key service.
- [ ] T008 Select, prove, and implement an Expo-compatible signed S3 `SyncRemote`; connect it to the existing sync engine and lifecycle-aware queue.

## Phase 3: Chat Experience

- [ ] T009 Implement the iOS session host using the autosave and first-send gate behavior merged from specs 107 and 108.
- [ ] T010 Compose `LLMChat.Root` inside a safe-area shell with native notifications, history drawer, and sync status.
- [ ] T011 Add unit coverage for session, history, import-gate, lifecycle flush, and sync-state behavior.

## Phase 4: Validation and Completion

- [ ] T012 Run lint, typecheck, unit tests, and the existing Electron Playwright suite.
- [ ] T013 Build and validate the physical-iPhone checklist in `quickstart.md`, recording the device and iOS version in the implementation PR.
- [ ] T014 Archive `specs/106-ios-app` in the implementation PR after all tasks and required reviews are complete.
