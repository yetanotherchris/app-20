# Feature Specification: Secret Storage

**Feature Branch**: `103-secret-storage`

**Created**: 2026-09-07

**Status**: Archived

**Input**: User description: "Secret storage for beta: import the AI provider key and S3 credentials from a file chooser and store them locally, behind a design that later OAuth-based providers can use."

## User Scenarios & Testing

### User Story 1 - Import the AI provider key (Priority: P1)

The user imports their provider API key from a file and the app uses it for requests.

**Why this priority**: Without a key the app cannot answer anything.

**Independent Test**: Import a key file and send a prompt; confirm the key is used. Import a malformed file and confirm a clear rejection.

**Acceptance Scenarios**:

1. **Given** a key file is available, **When** the user imports it, **Then** the key is stored locally and used for requests.
2. **Given** a key is already stored, **When** the user imports a new one, **Then** the old key is replaced.
3. **Given** a file that is not a valid provider key, **When** the user imports it, **Then** a clear error is shown and nothing is stored.

### User Story 2 - Import S3 credentials (Priority: P1)

The user imports S3 credentials and the app uses them for sync.

**Why this priority**: S3 sync is the backup path for the user's conversations.

**Independent Test**: Import S3 credentials and confirm the sync job can authenticate.

**Acceptance Scenarios**:

1. **Given** an S3 credentials file, **When** the user imports it, **Then** the credentials are stored locally and used by sync.
2. **Given** a malformed credentials file, **When** the user imports it, **Then** a clear error is shown and nothing is stored.

### User Story 3 - Remove a stored secret (Priority: P2)

The user removes a stored secret; the dependent feature fails clearly until a new one is imported.

**Why this priority**: A secret that cannot be removed cannot be rotated or revoked.

**Independent Test**: Remove a stored provider key; confirm requests fail with the missing-key error until a new key is imported.

**Acceptance Scenarios**:

1. **Given** a stored provider key, **When** the user removes it, **Then** requests fail with the missing-key error until a new key is imported.
2. **Given** stored S3 credentials, **When** the user removes them, **Then** sync stays disabled with a clear status until new credentials are imported.

### Edge Cases

- A file with a wrong format must be rejected with a clear message.
- Re-importing must overwrite, not duplicate.
- A key file with trailing whitespace or surrounding lines must be cleaned on extraction, or rejected with guidance; never stored with stray bytes.
- A file containing multiple kinds of secrets must be rejected with guidance; one import stores one secret.

## Requirements

### Functional Requirements

- **FR-001**: Imported secrets MUST come through a file chooser (the iOS app uses the platform document picker; see spec 106). The provider API key may additionally be supplied by the `OPENROUTER_API_KEY` environment variable (FR-009).
- **FR-002**: Secrets MUST be stored locally on the device, outside the conversation workspace, and MUST NOT be uploaded to the S3 bucket.
- **FR-003**: Imported content MUST be validated before storage.
- **FR-004**: Re-import MUST overwrite the stored secret.
- **FR-005**: Secrets MUST NOT be written to logs or surfaced in rendered errors.
- **FR-006**: Adding a new credential type (such as an OAuth token) MUST require no change to already-stored secrets and no migration of the store.
- **FR-007**: The user MUST be able to remove a stored secret.
- **FR-008**: Secret material MUST NOT be stored in plaintext inside the conversation workspace; the at-rest storage mechanism is a plan decision.
- **FR-009**: The provider API key MAY be supplied by the `OPENROUTER_API_KEY` environment variable, which takes precedence over the imported key in every build, including packaged builds. An environment key is validated by the same rules as an imported key, is never written to the store, and is never returned to the renderer.

### Key Entities

- **Secret**: A credential such as a provider API key or S3 access pair.
- **Secret Store**: The local storage that holds secrets.

## Success Criteria

### Measurable Outcomes

- **SC-001**: After import, the next request uses the imported key with no further setup.
- **SC-002**: Re-import updates the stored secret.
- **SC-003**: Malformed files are rejected without partial storage.
- **SC-004**: Secrets never appear in logs or user-visible errors.
- **SC-005**: After the stored secret is removed and no environment key is present, the dependent feature fails with the missing-credential error until re-import.

## Clarifications

### Session 2026-09-11

- The provider API key resolves from two sources: the `OPENROUTER_API_KEY` environment variable first, then the stored secret. The environment value is trimmed and an empty value is ignored. This applies in every build, including packaged builds, and an environment key is never written to the store. The S3 credential is unaffected and remains store-only.

## Assumptions

- The app is single-user; secrets belong to that user on that device.
- Beta uses file-based import; OAuth flows arrive with future providers.
- Secrets are never committed to the repository.
- The at-rest protection mechanism (such as a platform credential store) is decided in the plan; the spec requires only that secrets stay out of the workspace and the bucket.
- Honoring `OPENROUTER_API_KEY` in packaged builds is deliberate (FR-009). A same-user launcher or shell profile that sets it substitutes the key for every run. The provider endpoint stays pinned in packaged builds, so the key is not redirected to another host; the substitution changes only which OpenRouter account serves the request.
