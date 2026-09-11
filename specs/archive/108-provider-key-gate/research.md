# Research: Provider Key Gate

## R1: Reuse `secrets:status`

**Decision**: Call `window.appBridge.getSecretsStatus()` at submit time.

**Rationale**: `getSecretsStatus` reports `providerKey: true` for either a valid stored key or `OPENROUTER_API_KEY`. It provides exactly the availability decision without exposing a secret or adding a new bridge operation.

**Alternatives considered**:

- Read the key during application startup. Rejected because it adds unnecessary startup I/O and becomes stale after key removal.
- Add a dedicated gate IPC operation. Rejected because the existing typed status operation has the required semantics.

## R2: Continue the initial submit after successful import

**Decision**: Continue the intercepted submit after import succeeds.

**Rationale**: The shared chat component consumes an `onSubmit` interaction before the renderer callback returns, so an explicit retry of the unchanged draft is not available without changing that component. Continuing the original user-initiated submit meets the spec's permitted "send proceeds" outcome.

**Alternatives considered**:

- Require an explicit retry. Rejected because the unchanged draft cannot be submitted again through the shared component after the gate consumes the first event.

## R3: Retain the provider fallback

**Decision**: Do not remove `chat:start` missing-key handling.

**Rationale**: A key can be removed after the pre-submit status check. The existing stream-start error path reports `missing-key` and keeps the chat component's retryable prompt, meeting FR-005.

## R4: Reset the shared chat root after an unsuccessful gate

**Decision**: Remount `LLMChat.Root` after a cancelled or failed import while retaining the draft in `useShellSession`.

**Rationale**: The shared component consumes the submit event before the host callback returns and does not provide a rejected-submit reset operation. Remounting only the presentational root restores its Send control without losing session-owned messages or draft text.
