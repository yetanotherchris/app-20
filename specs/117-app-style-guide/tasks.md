# Tasks: Application Style Guide

## Phase 1: Specification alignment

- [x] T001 Amend `spec.md` to include the initial latest-control alignment and exclude only other screen rebuilds. Verify that the scope and assumptions do not conflict.

## Phase 2: Guide definition

- [x] T002 Create `docs/app-style-guide.md` with semantic color roles and their baseline values and uses. Verify coverage of surfaces, text, borders, actions, disabled controls, selected content, and feedback roles.
- [x] T003 Define typography, layout scales, borders, shadows, icons, interactive target sizes, and shared control states. Verify all required control states have a visible presentation rule.
- [x] T004 Define navigation, header, chat, composer, messages, lists, forms, feedback, empty, loading, and destructive-confirmation patterns. Verify each pattern states its shared behavior.
- [x] T005 Define iOS and desktop variation, accessibility requirements, and the relationship to the iOS chat visual specification. Verify equivalent roles retain the same meaning across platforms.

## Phase 3: Documentation verification

- [x] T006 Review the completed guide against FR-001 through FR-009 and confirm uncovered interface changes require a guide amendment before acceptance.
- [x] T007 Run `git diff --check` and verify that it reports no whitespace errors.
