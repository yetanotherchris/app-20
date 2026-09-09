# Research: Component Documentation

## R1: Existing public surface

The supported package entry point is `packages/chat/src/index.ts`. It exports the controlled `Chat` component, component parts, rendering primitives, theme helpers, accessibility helpers, status presentations, `useChatSession`, message types, and theme types. The reference must enumerate these exports without requiring consumers to import internal files.

## R2: Existing live example

`packages/chat-demo/src/ChatDemo.tsx` already exercises deterministic streaming, stop, failure, retry, regenerate, history loading, scrolling, large conversations, Markdown, unsafe Markdown, themes, high contrast, reduced motion, custom renderers, controls, icons, actions, state renderers, capability gates, disabled/read-only modes, and blur behavior. Reusing it provides a real component example and avoids a second state machine.

## R3: Build and hosting

The existing web app uses Vite with aliases for `react-native` and `react-native-svg`. The documentation app must use the same aliases. GitHub Pages can serve the Vite output from a workflow artifact, so no server-side rendering or runtime API is needed.

## R4: Versioning

`@app-20/chat` declares `0.3.0`, while the current workspace consumers request `0.1.0`. Documentation uses `0.3.0` as the package version and records the mismatch as a migration note. Installation examples use a workspace-neutral package placeholder where a published registry is not available.

## R5: Accessibility scope

The component targets WCAG 2.2 AA for default web controls and states. Beta screen-reader announcements are out of scope. The composer input focus indicator exception from spec 007 must be explicit. Host-supplied replacements remain the host's responsibility.

## R6: Verification

A deterministic script can check that documentation names every root export, required sections and claims exist, version markers agree, and the package build succeeds. Browser verification must prove navigation/search and that the live demo renders and responds to a deterministic control.
