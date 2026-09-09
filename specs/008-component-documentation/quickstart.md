# Quickstart: Component Documentation

## Local development

From the repository root:

```text
npm install
npm run docs:dev
```

Open the local Vite URL. The landing page contains the version selector, search, navigation, and live example. Use the live example controls to load a conversation, start streaming, stop it, and inspect the retained partial response.

## Production verification

```text
npm run docs:verify
npm run docs:build
npm run docs:preview
```

`docs:verify` checks the package export surface, required claims, version markers, and required sections. `docs:build` creates the GitHub Pages artifact at `docs/site/dist`.

## Minimal integration

Install the released package and its peer dependencies, then import from the package root:

```tsx
import { Chat } from '@app-20/chat'

<Chat
  messages={messages}
  draft={draft}
  status={status}
  hasEarlierMessages={false}
  isLoadingEarlier={false}
  onChangeDraft={setDraft}
  onSubmit={submit}
  onStop={stop}
  onLoadEarlier={loadEarlier}
/>
```

The host owns message state, draft state, transport, link navigation, and clipboard access. The component does not infer completion from callback return values.
