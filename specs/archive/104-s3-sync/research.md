# Research: S3 Sync

Phase 0 decisions for spec 104. Each records the chosen option, why, and the alternatives rejected.

## R1: A platform-neutral engine behind a narrow remote port

**Decision**: Put the reconciliation rules in a new source-only package `@app-20/sync`. The engine takes a local `ConversationFilePort` (spec 101) and a `SyncRemote` port with three operations: `listNames`, `readText`, `writeText`. The Electron S3 adapter implements `SyncRemote`; the engine itself imports no Node, Electron, or React (FR-007).

**Rationale**: Spec 106 requires S3 sync on iOS, where the Electron main process and Node-only S3 client do not exist. A narrow port expresses exactly what sync needs from a backend, so a Google Drive or iOS adapter is a new port implementation, not a change to the conflict rules. The local side reuses the existing file port unchanged, so path validation stays in the host.

**Alternatives considered**: Put sync in `apps/electron/src/main` only and duplicate it for iOS (rejected: the conflict rule and manifest rebuild would diverge). A generic key-value store interface (rejected: over-abstract and it hides that objects are small JSON documents with names).

## R2: `@aws-sdk/client-s3` for the S3 protocol

**Decision**: Use the official AWS SDK v3 S3 client in `apps/electron`. Configure `forcePathStyle: true` and the endpoint when the credential file provides one, and set `requestChecksumCalculation: 'WHEN_REQUIRED'` and `responseChecksumValidation: 'WHEN_REQUIRED'` so the client does not add flexible-checksum headers that non-AWS S3 servers may not support. List with `ListObjectsV2Command` and page on `NextContinuationToken`.

**Rationale**: The S3 protocol needs SigV4 signing, retries, pagination, and error classification. The SDK is the reference implementation and is already the shape S3-compatible servers expect. Checksum downgrades keep compatibility with MinIO and the test server while remaining valid against AWS.

**Alternatives considered**: The `minio` client package (rejected: less standard for AWS bucket auth and still a runtime dependency). Hand-rolled SigV4 over `fetch` (rejected: a large surface of signing and canonicalization code to own and get wrong for no dependency saving).

## R3: `@20minutes/s3rver` as the e2e S3 server

**Decision**: Run a maintained fork of `s3rver` (`@20minutes/s3rver@^4.0.4`, Node >= 20) on a loopback port in `tests/e2e/fake-s3.ts`. Pre-provision the bucket with the `configureBuckets` option. Use the server's dummy credentials `S3RVER`/`S3RVER` and `allowMismatchedSignatures: true`.

**Rationale**: It is an in-process TypeScript/JavaScript S3 server similar to MinIO, so no Docker and no background service are needed. Verified in this environment: `PutObject`, `GetObject` (`Body.transformToString()`), `ListObjectsV2`, and a missing-key `NoSuchKey` all behave against the AWS SDK v3 client. `allowMismatchedSignatures` is required because the fork's v4 signature check rejects the SDK's canonical request; unknown access keys still fail with `InvalidAccessKeyId` before the signature check, so the auth-failure path remains testable. The original `s3rver@3.7.1` (2021) and the fork's v5 (Node >= 24) were rejected: old dependencies and a CI Node 20 mismatch respectively.

**Alternatives considered**: A hand-written minimal S3 HTTP server in the repo (rejected: must implement ListObjectsV2 XML, range/ETag semantics, and signature passthrough; the maintained fork already does). MinIO via Docker (rejected: a service dependency in CI). `mock-aws-s3` / `aws-sdk-client-mock` (rejected: they mock the SDK rather than exercise the wire, so they would not prove the bucket receives real objects).

## R4: Object layout and manifest rebuild

**Decision**: Mirror the local folder at a fixed `conversations/` prefix: `conversations/<fileName>` and `conversations/manifest.json`, with the body written byte-for-byte (FR-008). Conflict resolution uses the conversation's `updatedAt`. The remote manifest is downloaded and its entries are added to the set of names to consider. After conversation objects are reconciled, the engine re-reads the local conversation files, rebuilds the manifest from those that parse, writes it locally, and uploads it.

**Rationale**: The manifest has no single update timestamp, so it cannot itself be last-write-wins. Treating it as a downloaded index and rebuilding it from files present on disk guarantees that no manifest entry references a conversation file that has not been written (spec edge case), and keeps the remote index consistent after a partial transfer.

**Alternatives considered**: Sync the manifest as an ordinary object keyed by its maximum entry `updatedAt` (rejected: adds a derived timestamp and an ordering that can disagree with the files). Skip the remote manifest entirely (rejected: FR-003 requires downloading it).

## R5: Conflict rule details

**Decision**: Compare ISO 8601 `updatedAt` strings lexicographically (they sort chronologically for UTC ISO values). The newer conversation wins; the loser is overwritten with the winner's exact bytes and its content is discarded (FR-004). Equal timestamps produce no write. A conversation present only locally is uploaded; present only remotely is downloaded (so a local deletion reappears, FR-009). A remote object that is missing, empty, or fails to parse is never treated as valid: if local content is valid the local copy is uploaded to repair it; if not, the object is skipped. A local file that exists but fails to parse is left untouched and reported, so a corrupt local file cannot be silently destroyed.

**Rationale**: This is the documented beta policy (last-write-wins, no merge, no deletion propagation). Repairing a corrupt remote from a valid local copy stops a partial upload from blocking sync forever without risking local data.

**Alternatives considered**: Preserve the losing copy under a conflict suffix (rejected: the spec states the losing copy is overwritten and not preserved). Propagate deletions with tombstones (rejected: explicit spec assumption).

## R6: Bounded startup sync before the window opens

**Decision**: In `app.whenReady`, after the conversation folder loads and the store reconciles, enqueue one sync and `await` it with a cap (about 10 seconds). Whether it finishes, times out, or fails, open the window afterward. A timed-out run continues in the background; the status reflects the eventual result. Save-triggered syncs go through the same serial queue so runs never overlap.

**Rationale**: Spec 105 requires startup sync to settle before session restore, so the first sync runs before the renderer mounts. A cap prevents an unreachable network from holding the window closed indefinitely. A connection-refused offline case fails immediately; the cap only guards a hanging connection.

**Alternatives considered**: Open the window first and refresh the renderer when sync finishes (rejected: overlaps spec 105, which owns restore-after-sync). Block indefinitely (rejected: an offline app would never open).

## R7: Status model, trigger, and capped-backoff retry

**Decision**: Track a status of `disabled`, `idle`, `pending`, `syncing`, or `error`, each with an optional typed error code. `disabled` means no stored credentials or no bucket. A completed local save sets `pending` and enqueues a run. A run sets `syncing`, then `idle` on success or schedules a retry on failure. Retries use capped exponential backoff (three attempts: 1 s, 4 s, 10 s); after the cap the status is `error` with `sync-failed` (or `network-error`). The next save or startup resets the attempt budget. Status is readable over `sync:get-status` and pushed on `sync:status`.

**Rationale**: This matches FR-002's required visible states and the edge case that rejected credentials fail with a clear status and capped retries without touching local data. A single serial queue makes overlapping triggers safe.

**Alternatives considered**: A spinner with no error state (rejected: FR-002 requires a failed state). Unlimited retries (rejected: the spec says capped). Event-driven per-file status (rejected: more surface than the beta status needs).

## R8: Extend the `s3` credential shape with bucket config

**Decision**: Extend `validateS3Credentials` to preserve optional `bucket`, `region`, and `endpoint` alongside the key pair. A keys-only file still validates and stores (spec 103 stays green). `getS3Config()` returns the parsed pair plus optional fields and reports "not configured" until a bucket is present. Validate the bucket name against the S3 DNS-compatible pattern, the region against `[a-z0-9-]+`, and the endpoint as an `http`/`https` URL, so a malformed value cannot reshape the request target.

**Rationale**: The single "Import S3 Credentials..." path is the user's one configuration step, matching `docs/overview.md`. Additive optional fields keep the spec 103 on-disk shape and tests valid, so no migration is needed. Validating the values in main keeps hostile input from altering the S3 host or path.

**Alternatives considered**: A second imported bucket-config secret kind (rejected during clarify: more menus and a new kind). Environment variables only (rejected: no user-facing configuration).

## R9: Structural extraction before behavior

**Decision**: Land the sync package's port and engine structure, the exported local file port, and the status surface as the foundational change, then add the S3 adapter and the background job as behavior in separate commits.

**Rationale**: AGENTS.md and the coding standards require structural and behavioral changes in distinct commits so the conflict rule is reviewed apart from wiring.
