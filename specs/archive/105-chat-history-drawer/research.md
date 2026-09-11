# Research: Chat History Drawer

Phase 0 decisions for spec 105. Each records the chosen option, why, and the alternatives rejected.

## R1: Drawer as a shell component, surface seam for iOS

**Decision**: Implement the drawer as a presentational React Native component, `renderer/src/components/HistoryDrawer.tsx`, beside `ShellTopBar` and `Notifications`. It imports only `react-native` primitives and the `ManifestEntry` type, and takes its data and callbacks as props. The component is not added to the published `app-20-llmchat` package.

**Rationale**: FR-009 requires the drawer on desktop and iOS, but the shared chat package is published externally and exposes message, composer, and status surfaces, not a left-overlay slot. This repository does not own that package and cannot change it here. A data-and-callback component with no Node or Electron import gives spec 106 the same behavior to reuse (spec 106 FR-008 assigns the iOS drawer to that app). The spec says the history drawer is chat-screen chrome; keeping it out of the message-rendering package also avoids widening that package's DOM/accessibility surface.

**Alternatives considered**: Add a `renderHistoryDrawer` slot to `app-20-llmchat` (rejected: the package is external and out of this repository's control; a slot without an owner would ship unused). Put the drawer in `packages/` (rejected: it needs shell state, messages, and drafts, which live in the Electron renderer, not a standalone package).

## R2: Reuse the manifest list and read channels; no new IPC

**Decision**: Read the history from the existing `conversations:list` result (`entries: ManifestEntry[]`, already most-recent-first through `sortManifestEntries`) and load a selected conversation with `conversations:read`. The ten-entry cap is applied in a pure renderer selector, not in storage or main.

**Rationale**: Spec 101 already provides the manifest entry fields the drawer needs (title, model, updatedAt) and already sorts newest first. Storage is uncapped (spec 101) and the beta cap is a presentation rule (FR-002), so it belongs where it is rendered. Adding a `history:*` channel would duplicate an existing one and grow the fixed preload surface for no behavior (constitution IV).

**Alternatives considered**: A dedicated `history:list` channel (rejected: same data as `conversations:list`). Re-reading each conversation to build the list in the renderer (rejected: the manifest already holds title, model, and date; reading every file to list ten would be wasteful and would surface corrupt-file errors at list time).

## R3: Switching conversations saves the current one first

**Decision**: `openConversation(id)` and the New conversation action both persist the current dirty conversation before switching, and abort the switch with a reported error if that save fails. Selecting the conversation that is already active short-circuits: it closes the drawer without a read, a reload, or a draft change.

**Rationale**: Spec 105 FR-004 requires that starting a new conversation not lose the current one, and selecting another conversation has the same risk. Until spec 107 autosave exists, the only persistence path is the manual save, so the drawer performs it as part of the switch without asking the user to do anything. Aborting on failure keeps the in-session content on screen (constitution III). The short-circuit satisfies the edge case that selecting the open conversation must not discard its draft.

**Alternatives considered**: Switch without saving and rely on spec 107 (rejected: 107 is not implemented, so this would lose the conversation now). Prompt the user before switching (rejected: the spec says starting a new conversation requires no save action and no prompt; the confirmation model is explicitly removed by spec 107).

## R4: Open and close never touch the transport

**Decision**: The drawer's open and close handlers only toggle the overlay and refresh the list. Only selecting a different conversation stops the active stream, through the same `stop` path the session already uses. Opening or closing the drawer while a response streams leaves the stream and the draft untouched.

**Rationale**: FR-008 and the first edge case state that opening or closing the drawer must not interrupt an in-flight response or discard a draft. Keeping open and close free of transport calls makes that a structural guarantee rather than a behavior to remember.

**Alternatives considered**: Stop the stream whenever the drawer opens (rejected: directly contradicts FR-008).

## R5: Presentation rules in a pure helper

**Decision**: Put the cap and the display labels in `renderer/src/history/historyEntries.ts`: `recentEntries(entries)` returns the first ten, `historyTitle(entry)` returns the title or the `Untitled` placeholder when it is blank, `historyModel(entry)` returns the model or a fallback when blank, and `historyDate(iso)` returns a stable `YYYY-MM-DD` string (empty for an unparseable value). The component maps these over the entries.

**Rationale**: Reading order, labels, and the cap are rules with edge cases (blank title, blank model, bad date) that deserve unit tests without rendering. The manifest model is `openrouter/auto` for beta but the field is a free string, so a blank or `auto` value is shown as stored with a fallback only when empty.

**Alternatives considered**: Format dates relatively (`Today`, `Yesterday`) (rejected: locale- and clock-dependent, hard to assert; a plain date is unambiguous). Inline the formatting in JSX (rejected: no unit coverage, and it mixes presentation rules into the component).

## R6: Corrupt and missing entries are reported, not fatal

**Decision**: The list result already carries `report.corrupt` from the spec 101 reconcile; the drawer hook reports `conversation-corrupt` through the existing notification path when that count is positive. Selecting an entry whose read fails reports the returned code and keeps the drawer and the other entries usable. Selecting a missing entry does not change the active conversation.

**Rationale**: FR-007 requires a corrupt or unreadable entry to be reported without crashing the drawer or blocking the others. The spec 101 store already isolates a corrupt file during reconcile, so the drawer only has to surface the typed code and leave selection available. Read failures reuse the same codes (`conversation-corrupt`, `conversation-not-found`) the session gets from `conversations:read`.

**Alternatives considered**: Hide corrupt files from the list (rejected: the list is the manifest, and hiding a user's file without telling them hides a data problem). Block selection while any entry is corrupt (rejected: FR-007 requires the other entries to stay selectable).
