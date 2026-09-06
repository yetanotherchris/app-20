# Feature Specification: S3 Sync

**Feature Branch**: `104-s3-sync`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "S3 sync for beta: a per-user bucket, background upload of local changes, startup download of the latest conversations, and overwrite behavior on conflict."

## User Scenarios & Testing

### User Story 1 - Sync conversations to the cloud (Priority: P1)

Local changes are uploaded to the user's bucket in the background without interrupting the chat.

**Why this priority**: The bucket is the user's backup; without it, a lost device means lost conversations.

**Independent Test**: Save a conversation and confirm it appears in the bucket without further action.

**Acceptance Scenarios**:

1. **Given** a conversation is saved locally, **When** the background job runs, **Then** the change is uploaded to the bucket.
2. **Given** the app is offline, **When** the user saves, **Then** the change is kept locally and uploaded when connectivity returns.

### User Story 2 - Restore from the cloud (Priority: P2)

On startup, the app downloads the latest conversations and manifest from the bucket.

**Why this priority**: A second device or reinstall should start from the latest state.

**Independent Test**: Change a conversation on one machine, start the app elsewhere, and confirm the change appears.

**Acceptance Scenarios**:

1. **Given** the bucket has newer content, **When** the app starts, **Then** the latest conversations and manifest are downloaded.
2. **Given** a conflict between local and remote, **When** sync runs, **Then** beta overwrites with the newer copy.

### Edge Cases

- No bucket configured must not crash the app; sync stays disabled with a clear status.
- A failed background upload must not corrupt local files.
- Offline operation must be fully functional; sync waits.

## Requirements

### Functional Requirements

- **FR-001**: Each user MUST have a configured S3 bucket.
- **FR-002**: A background job MUST upload local conversation and manifest changes.
- **FR-003**: On startup, the app MUST download the latest conversation files and manifest from the bucket.
- **FR-004**: Beta MUST use overwrite behavior for sync conflicts.
- **FR-005**: Sync MUST use the locally stored S3 credentials.
- **FR-006**: Empty, missing, and corrupt remote files are out of scope for beta and MUST NOT block the app.

### Key Entities

- **Bucket**: The user's S3 destination for conversation files.
- **Sync Job**: The background task that uploads and downloads.
- **Conflict**: A local and remote file changed for the same conversation.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Local changes propagate to the bucket without user action.
- **SC-002**: Startup restores the latest state from the bucket.
- **SC-003**: Conflicts resolve by overwrite in beta.
- **SC-004**: Offline operation and sync failure never lose local data.

## Assumptions

- The app is single-user with one bucket per user.
- Overwrite conflict behavior is acceptable for beta; merge strategies are future work.
- Empty, missing, and corrupt remote files are not handled in beta.