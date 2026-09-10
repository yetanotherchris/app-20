# Feature Specification: Desktop App Shell

**Feature Branch**: `100-electron-desktop-shell`

**Created**: 2026-09-07

**Status**: Archived

**Input**: User description: "The Windows desktop application shell: a window that opens to the chat screen, an app-managed conversation folder, menus, and quit and close flows that never discard unsaved work."

## Clarifications

### Session 2026-09-10

- The first-run create/choose workspace prompt is removed. The app now creates and uses an app-managed conversation folder on first run, under the app config directory (Electron `userData`). Updated: Input, US3, FR-002, FR-006, FR-008, FR-009, the Workspace entity (now Conversation Folder), the startup edge case, and Assumptions. The menu item "Open Workspace Folder" becomes "Show Conversations Folder".

## User Scenarios & Testing

### User Story 1 - Open the app and chat (Priority: P1)

The user launches the app and lands on the chat screen, ready to compose.

**Why this priority**: Launch to a usable chat screen is the minimum the desktop app must deliver.

**Independent Test**: Launch the built app; confirm a window opens with the chat screen and composer.

**Acceptance Scenarios**:

1. **Given** the app is installed, **When** the user launches it, **Then** a window opens showing the chat screen.
2. **Given** the app is running, **When** the user quits, **Then** the app exits cleanly with no unsaved work lost.
3. **Given** the app is already running, **When** the user launches it again, **Then** the existing window is focused and a second instance is not created.

### User Story 2 - Quit without losing work (Priority: P1)

The user quits or closes the window with unsaved changes; the app asks before discarding anything.

**Why this priority**: Losing a conversation is data loss and is non-negotiable.

**Independent Test**: Edit a conversation, then close and quit; confirm a confirmation appears and nothing is lost.

**Acceptance Scenarios**:

1. **Given** a conversation has unsaved changes, **When** the user closes the window, **Then** a confirmation appears before anything is discarded.
2. **Given** a conversation has unsaved changes, **When** the user quits the app, **Then** the changes are saved or the user is asked, never silently dropped.
3. **Given** the user confirms save at close, **When** the save fails, **Then** the window stays open, the failure is reported, and nothing is discarded.
4. **Given** a response is streaming, **When** the user quits, **Then** the in-flight operation is stopped, the partial content follows the unsaved-changes rule, and exit waits for that to resolve.

### User Story 3 - Conversations live in an app-managed folder (Priority: P2)

The app stores conversations in a fixed folder it owns, created on first run. The user is not asked to choose a folder.

**Why this priority**: JSON files on disk are the beta storage model, and the folder is discoverable without a first-run decision.

**Independent Test**: Launch the app, create a conversation, and confirm a JSON file is written to the app's conversation folder.

**Acceptance Scenarios**:

1. **Given** the app is installed, **When** it first starts, **Then** it creates its conversation folder without asking the user.
2. **Given** a conversation is saved, **When** it is written, **Then** a JSON file appears in the conversation folder.
3. **Given** the app restarts, **When** it starts, **Then** it reads conversations from the same folder.

### User Story 4 - Use the menu bar (Priority: P3)

The user reaches key actions from the menu bar.

**Why this priority**: Menus are the discoverable entry points for import and folder actions.

**Independent Test**: Open each menu entry and confirm it performs its action.

**Acceptance Scenarios**:

1. **Given** the app is running, **When** the user opens the menu bar, **Then** entries exist to reveal the conversation folder, import the provider API key, import S3 credentials, and quit.

### Edge Cases

- Closing with a failed save must leave the document dirty, never silently discard it.
- A missing or unreadable conversation folder must be created or reported clearly, without an absolute path.
- Renderer-visible errors must not leak absolute file paths.

## Requirements

### Functional Requirements

- **FR-001**: The app MUST launch to a usable chat screen.
- **FR-002**: The app MUST operate against an app-managed conversation folder that is the root for all conversation file access. Secrets live outside it (see spec 103).
- **FR-003**: Closing or quitting with unsaved changes MUST prompt before discarding anything.
- **FR-004**: Saves MUST be atomic; a failed save MUST leave the document dirty.
- **FR-005**: The renderer MUST NOT have direct access to the filesystem; all file access MUST go through a fixed set of named operations.
- **FR-006**: All paths MUST be validated against the resolved real path of the conversation folder.
- **FR-007**: Renderer-visible error messages MUST NOT contain absolute paths.
- **FR-008**: The app MUST provide a menu bar with entries to reveal the conversation folder, import the provider API key, import S3 credentials, and quit, with standard accelerators.
- **FR-009**: On first run the app MUST create and use its app-managed conversation folder, without asking the user to choose a folder.
- **FR-010**: The renderer MUST NOT depend on Node APIs, MUST run in an isolated context, and MUST operate under a restrictive content security policy.
- **FR-011**: Links activated in chat content MUST open in the system browser, never in the app window.

### Key Entities

- **Conversation Folder**: The app-owned root folder that contains the conversation files.
- **Document**: A single conversation opened in the app, tracked as clean or dirty.
- **Preload API**: The fixed, typed set of operations the renderer may call.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Launch, chat, and quit work with no loss of unsaved work.
- **SC-002**: A failed save leaves the document dirty and does not discard content.
- **SC-003**: No path from the renderer reaches the filesystem except through validated named operations.
- **SC-004**: Closing with unsaved changes always prompts.
- **SC-005**: No renderer-visible error message contains an absolute path.

## Assumptions

- The app is single-user and local-first; conversations live in an app-managed folder on the device.
- The folder defaults to a `conversations` subfolder of the app config directory (Electron `userData`), so it is `~/.config/app-20/conversations` on Linux and `%APPDATA%\app-20\conversations` on Windows. It is overridable for tests.
- Beta has no folder picker and no user-configurable location; choosing a storage location is future work.
- Windows desktop is the beta platform for the shell; the shared chat component also runs on iOS.
- The Windows build and distribution are independent of the iOS build.
- Unreadable or corrupt files are reported rather than silently skipped.
- Launching a second instance focuses the existing window.
- 100 owns the close and quit confirmation; spec 105 references it rather than restating it.
- 100 is the shell only. Conversation schema and manifest are owned by 101, the provider by 102, secret storage rules by 103, and the session flow by 105. The shell exposes the operations those specs will call.
- To make its own US3 file scenario testable before 101 lands, the shell persists the active document as a provisional JSON envelope in the conversation folder. Spec 101 owns the final schema; the shell will delegate to it when it exists.
- The shell's menu import actions implement a working file chooser plus a `safeStorage`-encrypted store outside the conversation folder. Spec 103 owns richer validation, rotation, and removal.
