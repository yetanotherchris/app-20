# app-20

Desktop and iOS LLM chat application. See [docs/overview.md](./overview.md) for the product vision.

## Prerequisites

- Node 22.13+
- npm

## Setup

```sh
npm install
```

## Run the chat component

The shared chat component runs in two test applications: a browser app (React Native Web) and an Electron harness. Both render the same component.

```sh
# Browser app (Vite dev server at http://localhost:5173)
npm run dev:web

# Electron harness
npm run dev:electron
```

Alternatively, target a workspace directly:

```sh
npm run dev --workspace apps/web
npm run dev --workspace apps/electron
```

## Tests and checks

```sh
npm run lint          # ESLint
npm run typecheck     # TypeScript strict check
npm test              # Vitest unit tests
npm run test:e2e      # Build the Electron harness, then run Playwright e2e
```
