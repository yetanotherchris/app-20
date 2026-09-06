# Feature Specification: Secret Storage

**Feature Branch**: `103-secret-storage`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "Secret storage for beta: import the AI provider key and S3 credentials from a file chooser and store them locally, behind a design that later OAuth-based providers can use."

## User Scenarios & Testing

### User Story 1 - Import the AI provider key (Priority: P1)

The user imports their provider API key from a file and the app uses it for requests.

**Why this priority**: Without a key the app cannot answer anything.

**Independent Test**: Import a key file and send a prompt; confirm the key is used.

**Acceptance Scenarios**:

1. **Given** a key file is available, **When** the user imports it, **Then** the key is stored locally and used for requests.
2. **Given** a key is already stored, **When** the user imports a new one, **Then** the old key is replaced.

### User Story 2 - Import S3 credentials (Priority: P1)

The user imports S3 credentials and the app uses them for sync.

**Why this priority**: S3 sync is the backup path for the user's conversations.

**Independent Test**: Import S3 credentials and confirm the sync job can authenticate.

**Acceptance Scenarios**:

1. **Given** an S3 credentials file, **When** the user imports it, **Then** the credentials are stored locally and used by sync.
2. **Given** a malformed credentials file, **When** the user imports it, **Then** a clear error is shown and nothing is stored.

### Edge Cases

- A file with a wrong format must be rejected with a clear message.
- Re-importing must overwrite, not duplicate.
- Secrets must never appear in logs or in rendered errors.

## Requirements

### Functional Requirements

- **FR-001**: Secrets MUST be imported through a file chooser.
- **FR-002**: Secrets MUST be stored locally on the device.
- **FR-003**: Imported content MUST be validated before storage.
- **FR-004**: Re-import MUST overwrite the stored secret.
- **FR-005**: Secrets MUST NOT be written to logs or surfaced in rendered errors.
- **FR-006**: The storage design MUST accommodate future non-file providers such as OAuth.

### Key Entities

- **Secret**: A credential such as a provider API key or S3 access pair.
- **Secret Store**: The local storage that holds secrets.

## Success Criteria

### Measurable Outcomes

- **SC-001**: An imported key works for requests within one import.
- **SC-002**: Re-import updates the stored secret.
- **SC-003**: Malformed files are rejected without partial storage.
- **SC-004**: Secrets never appear in logs or user-visible errors.

## Assumptions

- The app is single-user; secrets belong to that user on that device.
- Beta uses file-based import; OAuth flows arrive with future providers.
- Secrets are never committed to the repository.