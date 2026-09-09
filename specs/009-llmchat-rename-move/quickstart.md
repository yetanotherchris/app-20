# Quickstart: LLMChat Rename and Repository Move

**Date**: 2026-09-09

## Prerequisites

- Node.js 18+
- npm 9+
- Git
- Access to https://github.com/yetanotherchris/app-20-llmchat
- npm account with publish permissions

## Validation Scenarios

### Scenario 1: Install and Render (SC-002)

```bash
# In a test project
npm install app-20-llmchat
```

```tsx
import { LLMChat } from 'app-20-llmchat'

function App() {
  return (
    <LLMChat.Root messages={[]} onSend={(msg) => console.log(msg)}>
      <LLMChat.Conversation />
      <LLMChat.PromptInput />
    </LLMChat.Root>
  )
}
```

**Expected**: Component renders a chat interface with message list and input area.

### Scenario 2: Package Metadata (SC-001, SC-006)

```bash
cd app-20-llmchat
cat package.json | grep '"name"'
# Expected: "app-20-llmchat"

cat package.json | grep '"version"'
# Expected: "1.0.0"

npm pack --dry-run
# Expected: tarball under 100KB, contains only dist/, README, LICENSE, CHANGELOG
```

### Scenario 3: Build and Typecheck (SC-005)

```bash
cd app-20-llmchat
npm run build
npm run typecheck
# Expected: zero errors, all types correct
```

### Scenario 4: Tests Pass (SC-008)

```bash
cd app-20-llmchat
npm run lint
npm run typecheck
npm run test
npm run test:e2e
# Expected: all green
```

### Scenario 5: CI Workflow (SC-008)

Push a commit to `main` or open a PR. The CI workflow should:
1. Run lint
2. Run typecheck
3. Run unit tests
4. Run e2e tests
5. Run build

**Expected**: All steps pass.

### Scenario 6: Publish (SC-009)

```bash
cd app-20-llmchat
git tag v1.0.0
git push origin v1.0.0
```

**Expected**: GitHub Actions publish workflow triggers, runs all checks, publishes to npm.

### Scenario 7: Migration Guide (SC-004)

Navigate to the documentation site's migration guide.

**Expected**: Every renamed component listed with old and new names, before/after code examples, and common pitfalls.

### Scenario 8: Documentation (SC-003)

Navigate to the documentation site.

**Expected**: All examples use `LLMChat.Root`, `LLMChat.Conversation`, `LLMChat.PromptInput`, etc. No references to `@app-20/chat` or `Chat` component remain.

## Troubleshooting

- **Build fails**: Ensure TypeScript strict mode is enabled and all imports resolve.
- **Tests fail after rename**: Check that test files import from the new paths and use new component names.
- **npm publish fails**: Verify `NPM_TOKEN` is set in repository secrets and package name is unscoped.
