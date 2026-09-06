# Feature Specification: Windows Desktop App Shell

**Feature Branch**: `100-electron-desktop-shell`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "The Windows desktop application shell: a window that opens to the chat screen, folder-based workspaces, menus, and quit and close flows that never discard unsaved work."

## User Scenarios & Testing

### User Story 1 - Open the app and chat (Priority: P1)

The user launches the app and lands on the chat screen, ready to compose.

**Why this priority**: Launch to a usable chat screen is the minimum the desktop app must deliver.

**Independent Test**: Launch the built app; confirm a window opens with the chat screen and composer.

**Acceptance Scenarios**:

1. **Given** the app is installed, **When** the user launches it, **Then** a window opens showing the chat screen.
2. **Given** the app is running, **When** the user quits, **Then** the app exits cleanly with no unsaved work lost.

### User Story 2 - Quit without losing work (Priority: P1)

The user quits or closes the window with unsaved changes; the app asks before discarding anything.

**Why this priority**: Losing a conversation is data loss and is non-negotiable.

**Independent Test**: Edit a conversation, then close and quit; confirm a confirmation appears and nothing is lost.

**Acceptance Scenarios**:

1. **Given** a conversation has unsaved changes, **When** the user closes the window, **Then** a confirmation appears before anything is discarded.
2. **Given** a conversation has unsaved changes, **When** the user quits the app, **Then** the changes are saved or the user is asked, never silently dropped.

### User Story 3 - Work from a folder (Priority: P2)

The app operates on a workspace folder that holds the conversations.

**Why this priority**: Folder-based local storage is the beta storage model and gives the user direct access to their files.

**Independent Test**: Open a folder, create a conversation, confirm it is written as a file in the folder.

**Acceptance Scenarios**:

1. **Given** a workspace folder, **When** the user opens it, **Then** the app reads its conversations.
2. **Given** a conversation is saved, **When** it is written, **Then** a JSON file appears in the workspace folder.

### Edge Cases

- Closing with a failed save must leave the document dirty, never silently discard it.
- A missing or unreadable workspace must be reported clearly.
- Renderer-visible errors must not leak absolute file paths.

## Requirements

### Functional Requirements

- **FR-001**: The app MUST launch to a usable chat screen.
- **FR-002**: The app MUST operate against a workspace folder that is the root for all file access.
- **FR-003**: Closing or quitting with unsaved changes MUST prompt before discarding anything.
- **FR-004**: Saves MUST be atomic; a failed save MUST leave the document dirty.
- **FR-005**: The renderer MUST NOT have direct access to the filesystem; all file access MUST go through a fixed set of named operations.
- **FR-006**: All paths MUST be validated against the resolved real path of the workspace root.
- **FR-007**: Renderer-visible error messages MUST NOT contain absolute paths.

### Key Entities

- **Workspace**: The root folder that contains the user's conversations.
- **Document**: A single conversation opened in the app, tracked as clean or dirty.
- **Preload API**: The fixed, typed set of operations the renderer may call.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Launch, chat, and quit work with no loss of unsaved work.
- **SC-002**: A failed save leaves the document dirty and does not discard content.
- **SC-003**: No path from the renderer reaches the filesystem except through validated named operations.
- **SC-004**: Closing with unsaved changes always prompts.

## Assumptions

- The app is single-user and local-first; conversations live in a folder on the device.
- Windows desktop is the beta platform for the shell; the shared chat component also runs on iOS.
- Unreadable or corrupt files are reported rather than silently skipped.