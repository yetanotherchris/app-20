# Feature Specification: S3 Sync

**Feature Branch**: `104-s3-sync`

**Created**: 2026-09-07

**Status**: Archived

**Input**: User description: "S3 sync for beta: a per-user bucket, background upload of local changes, startup download of newer remote conversations, and a documented conflict rule."

## User Scenarios & Testing

### User Story 1 - Sync conversations to the cloud (Priority: P1)

Local changes are uploaded to the user's bucket in the background without interrupting the chat.

**Why this priority**: The bucket is the user's backup; without it, a lost device means lost conversations.

**Independent Test**: Save a conversation and confirm it appears in the bucket without further action.

**Acceptance Scenarios**:

1. **Given** a conversation is saved locally, **When** the background job runs, **Then** the change is uploaded to the bucket.
2. **Given** the app is offline, **When** the user saves, **Then** the change is kept locally and uploaded when connectivity returns.
3. **Given** no bucket is configured, **When** the app starts, **Then** sync is disabled with a clear status and the rest of the app works fully offline.

### User Story 2 - Restore newer remote content on startup (Priority: P2)

On startup, the app downloads remote conversations and manifest that are newer than the local copies.

**Why this priority**: A second device or reinstall should pick up changes made elsewhere.

**Independent Test**: Change a conversation on one machine, start the app elsewhere, and confirm the newer content appears.

**Acceptance Scenarios**:

1. **Given** the bucket holds conversations newer than the local copies, **When** the app starts, **Then** those conversations and the manifest are downloaded.
2. **Given** a conflict between a local and remote copy, **When** sync runs, **Then** the copy with the newer conversation update timestamp wins and the losing copy is overwritten.
3. **Given** a locally newer conversation changed while offline, **When** startup runs, **Then** the local copy is not clobbered; it is uploaded instead.

### Edge Cases

- No bucket configured must not crash the app; sync stays disabled with a clear status.
- A corrupt remote file must be skipped so it cannot block startup or sync.
- An upload interrupted mid-transfer must retry the complete file; a partial remote object must never be treated as a valid conversation.
- Credentials rejected by the bucket must fail sync with a clear status and capped retries, leaving local data unaffected.
- The app must never show a manifest entry whose conversation file has not finished downloading.

## Clarifications

### Session 2026-09-11

- Q: Spec 104 needs a bucket name and, for an S3-compatible server, a region and endpoint, but the stored S3 secret from spec 103 holds only the key pair. How is the bucket configured? A: The existing `s3` credential file is extended with a required `bucket` and optional `region` and `endpoint`. A keys-only file still imports (spec 103 behavior is preserved), but sync reports `not configured` until a bucket is present. One import path, no new menu.
- Q: The manifest has no single update timestamp, so how does it participate in FR-004 last-write-wins? A: Conflict resolution uses the conversation's own `updatedAt`. The remote manifest is downloaded and used as an index of conversation file names; after conversation objects are reconciled, the local manifest is rebuilt from the files present on disk and uploaded, so no manifest entry can reference a file that has not been written.
- Q: What does the background job observe as its trigger in the current shell, which still saves on demand? A: A completed local save enqueues a sync. Spec 107 (autosave) will call the same enqueue path; spec 104 does not change the save trigger.
- Q: Does the beta test suite need a real S3 service? A: No. E2E runs a local S3-compatible server (`@20minutes/s3rver`) and points the imported `endpoint` at it, matching the fake OpenRouter approach from spec 102.

## Requirements

### Functional Requirements

- **FR-001**: Sync MUST use a configured per-user S3 bucket. Without a configured bucket, sync MUST stay disabled and the rest of the app MUST remain fully functional.
- **FR-002**: A background job MUST run after each local save, retry failed uploads with backoff, and expose a visible status of pending, in progress, or failed.
- **FR-003**: On startup, the app MUST download remote conversation files and manifest that are newer than the local copies, per the conflict rule in FR-004.
- **FR-004**: Beta resolves conflicts by last-write-wins on the conversation's update timestamp; the losing copy is overwritten and its content is not preserved.
- **FR-005**: Sync MUST use the locally stored S3 credentials (see spec 103).
- **FR-006**: Empty, missing, and corrupt remote files MUST be skipped so they cannot block startup or sync.
- **FR-007**: The sync implementation MUST sit behind an interface so another sync provider can be added later.
- **FR-008**: Sync MUST upload conversation and manifest files as JSON without conversion.
- **FR-009**: Beta MUST NOT propagate deletions; a conversation deleted locally is re-created from the bucket on the next startup.

### Key Entities

- **Bucket**: The user's S3 destination for conversation files.
- **Sync Job**: The background task that uploads and downloads.
- **Conflict**: A local and remote file changed for the same conversation.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Local changes propagate to the bucket without user action.
- **SC-002**: Startup downloads newer remote content per the conflict rule and never clobbers locally newer content.
- **SC-003**: Conflicts resolve by last-write-wins on the conversation update timestamp.
- **SC-004**: Offline operation and sync failure never lose local data.

## Assumptions

- The app is single-user with one bucket per user.
- Device clocks are assumed roughly synchronized; clock skew between devices can misorder the conflict rule, and that risk is accepted for beta.
- The losing copy in a conflict is overwritten and not preserved; a merge strategy is future work.
- Deletions do not propagate in beta; the consequence (a deleted conversation returns from the bucket) is accepted.
- Empty, missing, and corrupt remote files are not repaired or reconciled in beta; they are skipped.
