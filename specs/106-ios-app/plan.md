# Implementation Plan: iOS App

**Branch**: `spec-106-ios-app` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

## Summary

Create an Expo iOS application that renders `app-20-llmchat` natively and uses the shared conversation and sync packages through iOS adapters. The app provides safe-area layout, a native history drawer, document-picker credential import, secure local secrets, OpenRouter streaming, autosave and first-send behavior from specs 107 and 108, and S3 sync. Implementation starts only after specs 107 and 108 merge into `main`.

## Technical Context

**Language/Version**: TypeScript strict, React Native, Expo SDK selected during setup

**Primary Dependencies**: Expo, Expo document picker, secure store, file system, safe-area context, and compatible S3 SigV4 transport selected after an EAS build check

**Storage**: App-sandbox conversation JSON files and manifest through `ConversationFilePort`; credentials in the iOS secure credential store; S3 mirrors the same JSON objects through `SyncRemote`

**Testing**: Vitest for adapters and session orchestration; existing Electron Playwright suite; physical-iPhone acceptance checklist for native behavior

**Target Platform**: iPhone, iOS beta distributed through EAS

**Constraints**: No Node or Electron imports. Credentials never enter component props, notifications, logs, or persisted conversation files. Conversation writes use a same-directory temporary file followed by replacement. Native lifecycle transitions flush the autosave session before backgrounding.

## Constitution Check

| Principle | Plan | Status |
| --- | --- | --- |
| I. Process Isolation | iOS has no Electron renderer boundary. Native services are exposed through narrow application interfaces; chat UI receives state and callbacks, not file or secret APIs. | PASS |
| II. Path Trust | The iOS file adapter receives only fixed, validated bare names from the shared store and resolves them inside the app-owned conversation directory. | PASS |
| III. No Data Loss | The file adapter writes a temporary sibling then replaces the destination. Autosave from spec 107 flushes terminal, idle-draft, and lifecycle state. | PASS |
| IV. Fixed and Typed API | iOS uses typed local service interfaces. It does not add Electron preload or generic invocation APIs. | PASS |
| V. Test Coverage | Unit tests cover native adapter rules; the physical-device checklist covers the native behaviors unavailable to Electron Playwright. | PASS |

## Project Structure

```text
apps/ios/
├── app.json                     # Expo and iOS bundle configuration
├── eas.json                     # EAS internal-distribution profile
├── package.json                 # iOS scripts and dependencies
├── tsconfig.json
├── App.tsx                      # safe-area application composition
└── src/
    ├── chat/                    # iOS session host and shared chat mappings
    ├── storage/                 # sandboxed atomic ConversationFilePort
    ├── secrets/                 # picker import, validation, secure storage
    ├── sync/                    # SyncRemote and lifecycle queue
    ├── history/                 # history selectors and native drawer
    └── components/              # iOS shell and notifications
specs/106-ios-app/
├── contracts/ios-host.md
├── data-model.md
├── plan.md
├── quickstart.md
├── research.md
├── spec.md
└── tasks.md
```

## Implementation Sequence

1. Confirm specs 107 and 108 are merged to `main`, then rebase this branch on that commit.
2. Initialize the Expo application and verify an EAS iOS build before application code.
3. Add storage, secrets, provider, and S3 adapters behind narrow typed interfaces.
4. Compose the native shell around the shared chat component and the reusable history drawer.
5. Add tests, complete the physical-device checklist, and archive this spec with its implementation PR.

## Complexity Tracking

The native S3 transport is the only non-trivial dependency decision. The desktop adapter cannot be copied because it assumes Node. The rejected alternative is implementing S3 reconciliation in the iOS app, which would duplicate `@app-20/sync` behavior and risk divergent conflict handling.
