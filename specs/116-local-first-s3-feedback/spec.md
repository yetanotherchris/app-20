# Feature Specification: Local-First S3 Mirror Feedback

**Feature Branch**: `spec-109-ios-chat-redesign`
**Created**: 2026-09-13
**Status**: Planned
**Depends on**: [112 iOS Settings and Credentials](../112-ios-settings-credentials/spec.md)

## User Scenarios & Testing

### User Story 1 - Continue after an S3 mirror failure (Priority: P1)

The user keeps a successfully saved local conversation when configured S3 mirroring is unavailable and can retry the remote write without resending a prompt.

**Independent Test**: Configure S3, cause a remote write failure after a local save, then retry and verify the prompt is not sent again and local history remains available.

## Requirements

### Functional Requirements

- **FR-001**: Without a complete S3 group, every conversation save MUST remain local and MUST not show an S3 warning.
- **FR-002**: With complete S3 configuration, a conversation mutation MUST commit locally before its remote mirror attempt. Remote latency or failure MUST not block viewing, sending, renaming, or deleting locally.
- **FR-003**: A remote mirror failure MUST show the designed nonblocking chat banner: `Saved on this device. Couldn’t save to S3.` with the accessible 44-point retry action.
- **FR-004**: Retrying MUST mirror pending conversation revisions and mutations without resending a model prompt or changing completed local state.
- **FR-005**: Remote writes MUST serialize by conversation revision so an earlier revision cannot overwrite a later revision.
- **FR-006**: Local rename and delete MUST complete first and retain their local result if their remote mirror fails. The same destination-error pattern applies.
- **FR-007**: Removing every S3 field MUST make future saves local only and MUST NOT imply remote deletion.
- **FR-008**: The feature MUST not add sync settings, sync-progress screens, connectivity tests, or credential upload to S3.

## Success Criteria

- **SC-001**: State 35 meets its documented trigger and visible differences.
- **SC-002**: A remote failure never removes a successful local change or causes a duplicate provider request.
- **SC-003**: Retrying a failed mirror eventually updates the remote destination using the latest local revision.

## Assumptions

- Existing background retry behavior remains when available. The explicit retry is required recovery, not a replacement for it.
