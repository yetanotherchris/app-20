# Research: Shared Chat Streaming and Operations

**Date**: 2026-09-08 | **Spec**: 006-shared-chat-streaming-operations

## R1: Where the streaming state machine lives

**Decision**: A `useChatSession` hook in `packages/chat/src/session/` owns the conversation's messages, chat status, and operation identity. The `Chat` component stays presentational and unchanged: it already renders message statuses (spec 005 badges), chat status text, per-message actions, and the Send/Stop affordances. Hosts drive the transport through the hook's operation handle.

**Rationale**: FR-001 through FR-011 require an operation-aware state machine (per-operation identity, stale-update rejection, stop semantics, retry/regenerate replacement, duplicate-event suppression). The host owns the network transport (spec assumption), so the component needs a controller that the host wires the transport into, while `Chat` remains the render surface. A hook (not a class) is the React-idiomatic controller, unit-testable without a DOM.

**Alternatives considered**: Putting the state machine inside `Chat` (turns the presentational component into a stateful one, breaking the controlled-prop model specs 001-004 built and making hosts unable to drive the transport); a reducer-only design (the transport side effects need lifecycle handling a hook provides); leaving stale-update handling entirely to hosts (fails FR-004/005 at the component boundary).

## R2: Operation identity and stale-update rejection (FR-004/005)

**Decision**: Every `submit`, `retry`, and `regenerate` creates an operation with a unique id. The hook keeps one `currentOp` (id, kind, message id, stopped flag, accumulated content). `appendChunk`, `complete`, and `fail` accept the operation id and are ignored when it does not match the current operation or when the operation's message is no longer in the conversation.

**Rationale**: FR-004 requires per-operation identity and FR-005 requires that updates from a superseded operation never change a newer response. A single current-operation guard is the simplest correct model for a one-response-in-flight beta (the spec's scale assumption). Checking both the op id and the target message id's presence covers the "conversation replaced during streaming" edge case without leaking updates into the new conversation.

**Alternatives considered**: A per-message update stamp (generalizes to multiple concurrent responses, which the beta explicitly does not have); rejecting by comparing a monotonically increasing operation counter (equivalent to the id check but less explicit).

## R3: Stop semantics (FR-006)

**Decision**: `stop()` acts only when a current operation is in a cancellable state (sending or streaming), transitions the response message to `stopped`, retains its partial content, and is a no-op on a second call or after the operation has ended. The hook exposes `controls.stopRequested()` so the transport can abort between chunks, and it guards `stop()` with an already-stopped flag.

**Rationale**: FR-006 requires partial content retained in every case (before first chunk, mid-stream, after final chunk) and a no-op second stop. Making stop idempotent at the controller and relying on the composer's existing busy gating (spec 003) covers the race where Stop is pressed as the final chunk arrives: whichever wins, exactly one terminal status (stopped or complete) is applied, because `complete` and `stop` are mutually exclusive on the current operation.

**Alternatives considered**: Letting the host arbitrate stop-vs-complete (leaves FR-006's determinism to the host); queueing stop to apply after the next chunk (adds a state the spec does not require).

## R4: Retry and regenerate replace in place (FR-007, edge cases)

**Decision**: `retry(messageId)` is available for assistant messages in `error`; `regenerate(messageId)` for assistant messages in `complete`. Both replace the target message in place (same id), reset its content to empty, mark it `sending`, open a new operation with the same prompt, and re-run the transport. The old attempt is not retained (spec assumption: keeping both attempts is future work).

**Rationale**: The spec's edge cases require replacing the failed/completed response in place, including a retry of an errored response with partial content. Reusing the message id keeps the message list stable (no remount, no scroll jump) and makes the superseded-operation guard natural: the new operation supersedes the old, so late updates from the old one are ignored (FR-005).

**Alternatives considered**: Appending a new message for each attempt (spec explicitly defers keeping both attempts); creating a new id and replacing the array item (remounts the row, losing the stable-id benefits).

## R5: Copy (FR-007, US4)

**Decision**: The hook builds a per-message `copy` action that collects the message's plain text (joining all content parts) and delegates to a host-provided `copyMessageText(message, text)` callback. Code-block copy stays on the existing `onCopyCode` path (spec 002/004).

**Rationale**: FR-007 requires copy per message. The component must not touch the clipboard itself (renderer isolation, no `navigator.clipboard` reliance), so the host callback performs the actual copy. The action model from spec 004 already provides the affordance; the hook wires it.

**Alternatives considered**: Reading `navigator.clipboard` directly in the component (breaks the renderer-isolation cleanliness and the existing delegation pattern used by `onCopyCode`).

## R6: Chat status on message failure (FR-010 and the 005 ErrorState conflict)

**Decision**: A failed response marks the message `error` and returns the chat status to `idle`, keeping the list visible with partial content and retry available. The chat status `error` remains the conversation-level error state that spec 005's ErrorState replaces the list with; it is host-set, not produced by a message failure.

**Rationale**: Spec 005's `stateKindFor` replaces the list whenever the chat status is `error`, even with messages present. If a message failure set the chat status to `error`, the conversation would hide behind the ErrorState, contradicting 006's edge case ("the message transitions to error, partial content is retained, and retry is available"). Message-level failure and conversation-level error are therefore distinct: the former marks the message and keeps the chat usable; the latter is host-driven.

**Alternatives considered**: Letting message failure set the chat status to `error` (hides the list, contradicts the edge case); adding a new chat status (conflicts with the 006 vocabulary).

## R7: Draft and typing are untouched (FR-009, FR-011)

**Decision**: The hook never reads or writes the composer draft. The draft remains host-controlled (spec 003) and is passed to `Chat` separately. Streaming updates mutate only the message list the hook owns.

**Rationale**: FR-009 and FR-011 require streaming and updates not to alter the draft or interrupt typing. Because the draft is a distinct controlled prop and the message updates are a separate state slice, the two cannot interfere. This is guaranteed by construction, and the e2e asserts typing continues during a stream.

**Alternatives considered**: Owning the draft in the hook (would re-implement spec 003's semantics and risk the guarantee).

## R8: Transient statuses and persistence (FR-012)

**Decision**: The hook's transient statuses (`sending`, `streaming`) are runtime-only; nothing in the component persists them. The `Message.status` field remains part of the component's runtime model (spec 101 owns the persisted vocabulary). The contract documents that transient statuses must be mapped out of the persisted vocabulary by the host before storage.

**Rationale**: FR-012 forbids persisting transient statuses. The component has no storage access (constitution I), so the guarantee is structural plus a documented contract note for the future persistence layer.

**Alternatives considered**: Stripping transient statuses in the hook's output (would hide state the renderer needs and duplicate spec 101's concern).

## R9: Transport shape

**Decision**: `useChatSession` accepts a `request(op, controls)` function. `controls` exposes `appendChunk`, `complete`, `fail`, and `stopRequested`. The host implements the network call; the hook provides deterministic state transitions. The demo uses a timer-based fake transport; e2e asserts against it.

**Rationale**: The spec assumption says the host drives network requests. A single `request` callback with a controls object keeps the transport contract small and testable, and gives the host a natural place to wire OpenRouter streaming later. `stopRequested` lets the transport abort cooperatively.

**Alternatives considered**: Exposing raw primitives (`appendChunk` etc.) and letting the host call them from anywhere (loses the single lifecycle boundary and makes stale-op discipline the host's problem again); an event-emitter transport (more surface than a callback).
