# Implementation Plan: Component Documentation

**Branch**: `spec-008-component-documentation` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)

## Summary

Build a versioned static documentation site for `@app-20/chat`. The site is a small React/Vite application that renders the existing `ChatDemo` for live examples and presents task-oriented guides, reference tables, recipes, accessibility notes, platform notes, concepts, changelog, and migration information. Vite produces the GitHub Pages artifact; the repository workflow publishes `docs/site/dist` from the source branch.

## Technical Context

**Language/Version**: TypeScript strict mode, React 19, Vite 7, React Native Web 0.21.

**Primary Dependencies**: Existing workspace dependencies only. The documentation app reuses `@app-20/chat` and `@app-20/chat-demo`, React, React DOM, Vite, and the existing React Native Web/SVG aliases. No documentation framework or runtime service is introduced.

**Storage**: None. Examples use deterministic in-memory state supplied by `ChatDemo`.

**Testing**: TypeScript and ESLint for the documentation app, Vite production build, a source-level verification script that checks public export/reference coverage and required documentation claims, and Playwright coverage for the published-like documentation app and live demo controls. Existing repository unit and Electron e2e suites remain required.

**Target Platform**: GitHub Pages in modern desktop and mobile browsers. The component examples cover the web and touch/mobile integration notes separately.

**Publication**: GitHub Actions builds the documentation app and deploys `docs/site/dist` to GitHub Pages. Versioned content lives at `/v0.3.0/`; the root redirects to the current version.

## Constitution Check

- **Process Isolation**: The documentation site is browser React code and does not access Node, Electron, or filesystem APIs at runtime. PASS.
- **Path Trust / No Data Loss / Preload API**: No desktop filesystem, save, or IPC behavior is added. N/A.
- **Test Coverage**: The site adds user-visible behavior, so it includes Playwright coverage plus lint, typecheck, build, and repository test gates. PASS.
- **Technology constraints**: The documentation states the actual WCAG scope, safe rendering posture, supported content model, and host-owned transport/navigation/clipboard responsibilities. PASS.

## Project Structure

```text
specs/008-component-documentation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/reference.md
└── tasks.md

docs/site/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── site.tsx
│   ├── content.ts
│   ├── styles.css
│   └── components/
│       ├── DocsLayout.tsx
│       ├── LiveExample.tsx
│       └── ReferenceTable.tsx
└── public/
    └── version.json
scripts/
└── verify-component-docs.mjs
.github/workflows/
└── docs.yml

tests/e2e/
└── component-documentation.spec.ts
```

## Decisions

1. Use the package's declared `0.3.0` as the current documentation version. The workspace consumer metadata still requests `0.1.0`; the docs explicitly identify `0.3.0` as the package release and record the workspace mismatch in migration notes rather than publishing a false install command.
2. Keep one source page rendered by the React app and expose it under the versioned path through Vite base-path configuration. The root page redirects to the current version.
3. Treat the public root export in `packages/chat/src/index.ts` as the reference input. Internal modules are linked only as implementation context, never as required imports.
4. Use the existing deterministic `ChatDemo` as the live example. The documentation's controls explain the operation rather than duplicating a mock chat implementation.
5. Verification checks required claims and export names from source, but does not attempt to infer undocumented semantics from arbitrary implementation details.

## Complexity Tracking

The site has a small content registry instead of separate Markdown files because the reference table, search index, version badge, and navigation must stay synchronized. The rejected simpler alternative is hand-maintained HTML per page, which would make public-surface checks and version updates drift. No new runtime dependency or backend is required.
