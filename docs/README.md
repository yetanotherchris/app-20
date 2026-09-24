# app-20

Desktop and iOS LLM chat application. See [docs/overview.md](./overview.md) for the product vision.

## Prerequisites

- Node 22.13+
- npm

## Setup

```sh
npm install
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev:web` | Start the browser chat application with Vite. |
| `npm run dev:electron` | Start the Electron chat application in development mode. |
| `npm run dev:ios` | Start Metro for the installed iOS development client. |
| `npm run build:electron` | Build the Electron application. |
| `npm run build:web` | Build the browser application. |
| `npm run build:ios` | Create an internal iOS preview build through EAS. |
| `npm run build:ios:preview` | Alias for `npm run build:ios`. |
| `npm run build:ios:dev` | Create an iOS development build through EAS. |
| `npm run docs:dev` | Start the component documentation site. |
| `npm run docs:build` | Build the component documentation site. |
| `npm run docs:preview` | Serve the built component documentation site. |
| `npm run docs:test:e2e` | Build the documentation site and run its Playwright tests. |
| `npm run lint` | Run ESLint. |
| `npm run format:check` | Check formatting with Prettier. |
| `npm run typecheck` | Run TypeScript checks in every workspace that defines a typecheck script. |
| `npm test` | Run Vitest unit tests. |
| `npm run test:e2e:electron` | Build the Electron application and run Playwright end-to-end tests. |
| `npm run test:e2e:ios` | Run the Maestro native iOS suite against an installed development build. It never launches Electron. |
| `npm run dev:smoke` | Run the local development smoke check. |
| `npm run verify` | Run linting, type checks, unit tests, Electron build, smoke check, and Electron end-to-end tests. |

## Browser and Electron development

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

## iOS development

`npm run build:ios:dev` creates a custom iOS development client through EAS. It is not an Expo Go build. Install the generated build on the provisioned device once, then use `npm run dev:ios` for JavaScript and TypeScript changes. Open the installed App-20 development client to connect it to Metro.

Create and install a new development build when native dependencies, native configuration, or native code changes. Use `npm run build:ios` for an internal preview build that does not connect to Metro.

Check the signed-in Expo account with:

```sh
npx eas-cli@latest account:view
```

EAS CLI does not report remaining build allowance or account credit. View the current remaining iOS build allowance in the [Expo billing dashboard](https://expo.dev/accounts/yetanotherchriss-team/settings/billing).

## Tests and checks

```sh
npm run lint          # ESLint
npm run typecheck     # TypeScript strict check
npm test              # Vitest unit tests
npm run test:e2e:electron # Build the Electron harness, then run Playwright e2e
```
