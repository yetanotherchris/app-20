# Tasks: Component Documentation

**Input**: Design documents from `/specs/008-component-documentation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/reference.md, quickstart.md

**Tests**: Included. Documentation behavior is verified with the repository lint/typecheck/build gates, a static verification script, and Playwright browser coverage.

## Phase 1: Setup

- [x] T001 Add documentation workspace scripts and `docs/site` Vite package using the existing React/Vite toolchain.
- [x] T002 Add the shared React Native Web and SVG-stub aliases required to bundle the actual chat demo.
- [x] T003 Add `docs/site/public/version.json` and the GitHub Pages workflow for the versioned artifact.

## Phase 2: Content and reference foundation

- [x] T004 Add the versioned documentation content registry with navigation, claims, release notes, and migration notes.
- [x] T005 Add exhaustive root-export reference metadata for the current `@app-20/chat` public surface, including required/optional status, defaults, host contract, examples, and target version.
- [x] T006 Add the documentation verification script that checks exports, required sections, safety/accessibility/platform claims, version alignment, and internal links.

## Phase 3: Documentation application

- [x] T007 Build the responsive documentation shell with table of contents, version selector, search, section navigation, and accessible landmarks.
- [x] T008 Build the live example section using the real `ChatDemo`, with explanations for send, stream, stop, retry, regenerate, history loading, scrolling, long content, themes, and customization.
- [x] T009 Build reference tables and copyable recipes for controlled integration, session transport, theming, renderers, custom controls/actions, scrolling/history, and stopped/error states.
- [x] T010 Add concepts, accessibility, platform, safety, limitations, changelog, and migration sections matching spec 008 and specs 001 through 007.
- [x] T011 Add responsive documentation styles for desktop, touch/mobile widths, keyboard focus, 200% zoom, high contrast, reduced motion, and readable code/reference tables.

## Phase 4: Verification

- [x] T012 Add Playwright coverage for landing-page navigation/search, version marker, live demo rendering, and a deterministic demo interaction.
- [x] T013 Run `npm run docs:verify`, `npm run docs:build`, `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run test:e2e`.
- [x] T014 Update this task list and the spec status to reflect completed implementation and verification.

## Dependencies and execution order

- T001-T003 are setup and must complete before site code is built.
- T004-T006 provide the content and verification model used by T007-T011.
- T012 depends on the complete site and live example.
- T013 depends on all implementation tasks.
- T014 is last.

## Parallel opportunities

- T003 and T006 can proceed independently after setup.
- T004 and T005 can proceed in parallel because they are separate content registries.
- T008-T011 can proceed in parallel after the shell and content foundation, provided they do not edit the same file.
