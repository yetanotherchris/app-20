# Feature Specification: Age Encryption for the Secret Store

**Feature Branch**: `108-age-secret-encryption`

**Created**: 2026-09-11

**Status**: Archived

**Parent**: [spec 103 Secret Storage](../archive/103-secret-storage/spec.md)

**Input**: Addendum to spec 103. Verify that the at-rest secrets payload is encrypted with age under a passphrase held in the OS credential store, and that the older per-value format is not used.

## Context

Spec 103's plan selected age passphrase encryption for the secrets store so that the desktop app, the future conversation encryption, and the iOS app share one portable format. This addendum states that requirement and the checks that prove it, so the format is verified on disk rather than assumed. It changes no user-facing behaviour beyond spec 103.

## User Scenarios & Testing

### User Story 1 - The stored payload is an age file (Priority: P1)

The user's imported credentials are held in an age file that cannot be read without the passphrase in the OS credential store.

**Why this priority**: The whole point of the change is at-rest protection with a shared format. If the payload is not an age file, the change did not happen.

**Independent Test**: Import a provider key, then inspect the data directory: the payload file is an age ASCII-armored file containing none of the imported plaintext, the passphrase file exists and is not plaintext, and no legacy per-value file is created.

**Acceptance Scenarios**:

1. **Given** a stored provider key, **When** the data directory is inspected, **Then** the payload file starts with the age armor header and the plaintext key appears in neither the payload nor the passphrase file.
2. **Given** a stored provider key, **When** the passphrase is recovered from the OS vault, **Then** age decrypts the payload to the stored credential.
3. **Given** the payload file alone, **When** it is read without the passphrase, **Then** it yields ciphertext only and no credential.
4. **Given** the older per-value secret file from spec 102, **When** the new build stores a secret, **Then** the older file is neither read nor converted and no file with the older name is created.

### Edge Cases

- A missing or replaced passphrase makes the existing payload unreadable. This is accepted for beta (no migration) and the user imports again.
- A payload that cannot be decrypted or parsed reads as an empty store rather than exposing plaintext.

## Requirements

### Functional Requirements

- **FR-001**: The at-rest secrets payload MUST be an age-encrypted file.
- **FR-002**: The age passphrase MUST be random per install and held only in the OS credential store.
- **FR-003**: The plaintext of any credential MUST NOT appear in the payload file or the passphrase file.
- **FR-004**: The store MUST NOT read, convert, or recreate the older per-value secret file.
- **FR-005**: A check MUST verify the on-disk payload is a valid age file that decrypts only with the passphrase.

### Key Entities

- **Age payload**: the ASCII-armored age file that holds the credential object.
- **Passphrase**: the random value, protected by the OS credential store, that decrypts the payload.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A unit test encrypts and decrypts with a passphrase and asserts the output is armored, contains no plaintext, and rejects a wrong passphrase.
- **SC-002**: An end-to-end run asserts the on-disk payload starts with the age armor header, contains none of the imported secret, and that no legacy secret file is created.
- **SC-003**: A missing or wrong passphrase yields no plaintext.

## Assumptions

- Beta, single user. No migration from the older format, per the AGENTS.md beta rule.
- The age format is intentional so the future conversation encryption and the iOS app reuse one primitive.
