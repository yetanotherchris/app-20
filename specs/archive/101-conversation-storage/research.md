# Research: Conversation Storage

Phase 0 decisions for spec 101. Each entry states the decision, why it was chosen, and the alternatives considered.

## R1. Storage and schema live in a platform-neutral package

**Decision**: Add `packages/conversation-storage` (name `@app-20/conversation-storage`), a private workspace package that exports the schema types, parse/serialize functions, manifest operations, filename helpers, and a `ConversationStore` built on an injected `ConversationFilePort`. The package imports no Node builtin, no Electron, and no React. The Electron main process supplies a filesystem port; the iOS app supplies its own.

**Rationale**: Spec 101 FR-012 requires the storage and schema layer to be implementable without Electron so the iOS app reuses it unchanged, and FR-009 requires file storage to sit behind an interface. A package with a port boundary satisfies both and keeps the path/atomically-write concerns in each host, where the constitution places them. The existing `chat-demo` package establishes the convention: `main`/`types` point at `src/index.ts` with no build step.

**Alternatives considered**: Keep the schema in `apps/electron/src/renderer/src/conversation` (cannot be reused by iOS; mixes Electron and schema concerns); put the schema in the already-published `app-20-llmchat` component package (couples storage to the UI library and forces a release of an external package); publish a new external package now (premature for beta).

## R2. Canonical schema

**Decision**: One JSON object per conversation:

```json
{
  "id": "conversation-1a2b",
  "title": "How do I export a CSV",
  "model": "openrouter/auto",
  "createdAt": "2026-09-10T12:00:00.000Z",
  "updatedAt": "2026-09-10T12:00:00.000Z",
  "draft": "",
  "messages": [
    {
      "id": "m1",
      "role": "user",
      "content": "How do I export a CSV?",
      "createdAt": "2026-09-10T12:00:00.000Z",
      "status": "complete"
    }
  ]
}
```

`role` is `system | user | assistant | tool` (`tool` reserved). `status` is persisted only as `complete | stopped | error`. No provider-specific field is emitted.

**Rationale**: Spec 101 FR-001, FR-003, FR-004, FR-005, FR-006. The message shape is the OpenAI chat-completions message (`role`, string `content`) plus the app-owned `id`, `createdAt`, and `status`. `model` and the timestamps give the manifest and spec 104's last-write-wins rule what they need without provider payloads.

**Alternatives considered**: Store the provider's raw response object (violates FR-006 and leaks provider fields); store `content` as an array of parts (the spec requires string `content`; parts are a UI concern mapped in the renderer adapter).

## R3. Manifest file and entry shape

**Decision**: `manifest.json` sits beside the conversation files in the conversation folder:

```json
{
  "version": 1,
  "conversations": [
    {
      "id": "conversation-1a2b",
      "fileName": "conversation-1a2b.json",
      "title": "How do I export a CSV",
      "model": "openrouter/auto",
      "updatedAt": "2026-09-10T12:00:00.000Z"
    }
  ]
}
```

A missing manifest is an empty history, not an error. A corrupt manifest is treated as empty and rebuilt from the conversation files.

**Rationale**: Spec 101 FR-002 lists id, filename, title, model, and date; `updatedAt` is the date and the field spec 104 compares. Keeping the manifest in the same folder means spec 104 mirrors the folder to S3 without a second location. `fileName` decouples the manifest from any filename convention, so an orphan-renamed file stays addressable.

**Alternatives considered**: Store the manifest outside the folder in `userData` (spec 104 would need a second sync location); derive the filename from the id and omit `fileName` (breaks once a collision forces a `-2` suffix).

## R4. Status normalisation at save and restore

**Decision**: `toPersistedStatus(value)` maps `stopped` and `error` through, and maps everything else (including `queued`, `sending`, `streaming`, and `complete`) to `complete`. Save uses it on every message; parse uses it on every persisted message.

**Rationale**: Spec 101 FR-011. A transient status must never reach disk, and a file that (through an older build or a hand edit) carries a transient value must be read as terminal rather than rejected. Serialization also normalises, so the storage boundary enforces the rule even when a caller passes a transient value.

**Alternatives considered**: Reject a message with an unrecognised status (drops user content, contradicts the tolerant reader requirement); keep the six-value union in the file (violates FR-011).

## R5. Tolerant reader for future optional message fields

**Decision**: `ConversationMessage` declares optional `updatedAt`, `parentId`, `error`, and `metadata` fields. Parse copies each when present with the correct type and ignores any other unknown keys. Serialize emits only the fields that are present.

**Rationale**: Spec 101 FR-010 names update time, parent message ID, error, and metadata as future fields a beta reader must tolerate. Ignoring truly unknown keys keeps the canonical output provider-free (FR-006). Preserving the four named fields avoids stripping data a newer writer added.

**Alternatives considered**: Preserve an arbitrary `extra` bag (over-engineering for fields the spec already enumerates); reject unknown keys (breaks forward compatibility).

## R6. Atomic per-file writes plus startup reconciliation

**Decision**: Each conversation file and the manifest are written independently with the existing `atomicWriteFile` (temp file in the same directory, `fsync`, rename). There is no cross-file transaction. At startup the store reconciles the manifest against the folder: entries whose file is missing are dropped, conversation files with no entry are parsed and added, and unparseable files are reported and left on disk.

**Rationale**: Spec 101 edge cases require the previous complete version to survive a crash and require a valid file missing from the manifest to be repaired at startup. Two atomic writes plus reconciliation gives both without a journal. A crash between the content write and the manifest write leaves the content file intact and the manifest repairable.

**Alternatives considered**: Write both files through one temp-and-rename pair (renaming two files is not a single atomic operation on any supported platform); a journal or SQLite (excluded by FR-007 and the constitution).

## R7. Filesystem access through a port

**Decision**: `ConversationFilePort` has `listFileNames`, `readText`, `writeText`, and `removeFile`, all keyed by bare file name. The store never sees a path. The Electron port resolves each name with `assertPathWithinFolder` against the real conversation folder and writes with `atomicWriteFile`, and caps reads at 8 MB.

**Rationale**: Spec 101 FR-009 and FR-012. Keeping names (not paths) in the store means the host owns path validation (constitution II) and the store is portable. The 8 MB cap matches the shell's existing read cap.

**Alternatives considered**: Pass a root path into the store and let it join paths (moves path handling into the shared package and out of main-process validation); expose a Node `fs.promises`-like port (pulls Node types into a package iOS must import).

## R8. Unique filename for an orphan collision

**Decision**: `uniqueConversationFileName(preferredId, existingNames)` returns `<id>.json` when free, otherwise `<id>-2.json`, `<id>-3.json`, and so on. Reconciliation never deletes an orphan file; it parses and adopts it, or leaves it if unparseable.

**Rationale**: Spec 101 edge case: a new conversation whose filename already exists but is not in the manifest gets a fresh unique name, and the orphan file is left untouched. Checking `listFileNames` (not just the manifest) covers the orphan case.

**Alternatives considered**: Overwrite the orphan (loses data); namespace new saves with a random suffix always (unreadable filenames and no stable id-to-file mapping).

## R9. Replace the generic file IPC with named conversation operations

**Decision**: Remove `folder:list`, `file:read`, and `file:write` from the preload contract and add `conversations:list`, `conversations:read`, and `conversations:save`. Main registers the new handlers against the store; the renderer session uses them. `folder:get` and `folder:reveal` remain for the shell UI.

**Rationale**: Spec 101 FR-009 puts storage behind an interface, and constitution IV asks for named operations rather than a generic file surface. The store owns manifest maintenance, so the renderer must not write conversation files directly or it would bypass the manifest. Removing the generic channels tightens the preload API.

**Alternatives considered**: Keep `file:*` and add conversation channels beside them (two overlapping write paths, and a renderer could still write a file without a manifest update).

## R10. Corrupt-file reporting

**Decision**: `store.list()` returns a report `{ dropped, repaired, corrupt }`. The store read path returns a discriminated `ConversationLoad` (`ok` / `missing` / `corrupt`). The IPC layer maps `missing` to `conversation-not-found` and `corrupt` to `conversation-corrupt`, both with fixed path-free messages. The renderer shows a notification when `list` reports a corrupt file.

**Rationale**: Spec 101 edge case: a corrupt conversation file is reported, not fatal. The report count keeps the shell's automatic restore from silently ignoring damage, and the typed read result keeps the corruption visible when the user opens a specific conversation.

**Alternatives considered**: Log to the main process console only (invisible to the user and to e2e); throw on the first corrupt file (crashes startup and blocks other conversations).

## R11. Draft retention on the conversation envelope

**Decision**: Keep an optional `draft` string on the conversation. The renderer adapter reads and writes it; the store treats it as an opaque optional string.

**Rationale**: Spec 100 persisted the composer draft provisionally and its e2e asserts the draft survives restart. Spec 101 is silent on the draft; dropping it would regress delivered user-visible behavior. Recorded in the spec's Clarifications rather than only in code.

**Alternatives considered**: Remove `draft` (spec 100 regression); persist the draft as a synthetic message (pollutes the message list and the provider context).

## R12. Workspace source consumption

**Decision**: `packages/conversation-storage` points `main` and `types` at `src/index.ts` with no build step, matching `packages/chat-demo`. `apps/electron/package.json` lists it as a dependency; `npm install` links the workspace. The package has its own `typecheck` script. Because electron-vite externalizes `dependencies` for the main process by default, `apps/electron/electron.vite.config.ts` sets `main.build.externalizeDeps = { exclude: ['@app-20/conversation-storage'] }` so the source-only package is bundled instead of required at runtime.

**Rationale**: The monorepo already consumes the demo package this way; electron-vite and Vitest both resolve TypeScript source. No publish or build orchestration is needed for beta. Without the exclude, the built main process requires the package at runtime and Node cannot resolve its extensionless TypeScript imports.

**Alternatives considered**: Build the package to `dist` first (adds a build step and ordering to every gate); duplicate the schema in the app (defeats FR-012); move the package to `devDependencies` (relies on the bundler's dependency grouping rather than stating the intent).
