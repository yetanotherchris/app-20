# npm Package Contract: app-20-llmchat

## Package Metadata

```json
{
  "name": "app-20-llmchat",
  "version": "1.0.0",
  "private": false,
  "description": "React component library for LLM chat interfaces",
  "main": "dist/index.js",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "repository": {
    "type": "git",
    "url": "https://github.com/yetanotherchris/app-20-llmchat.git"
  },
  "homepage": "https://yetanotherchris.github.io/app-20-llmchat",
  "bugs": {
    "url": "https://github.com/yetanotherchris/app-20-llmchat/issues"
  },
  "keywords": [
    "react",
    "chat",
    "llm",
    "ai",
    "conversation",
    "component",
    "ui",
    "react-native",
    "react-native-web"
  ],
  "license": "MIT",
  "files": [
    "dist",
    "README.md",
    "LICENSE",
    "CHANGELOG.md"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-native": "^0.86.0",
    "react-native-web": "^0.21.0"
  },
  "dependencies": {
    "@legendapp/list": "^3.3.10",
    "react-native-marked": "^8.1.1",
    "react-native-svg": "^15.15.0"
  }
}
```

## Validation

- `npm pack` must produce a tarball containing only `dist/`, `README.md`, `LICENSE`, `CHANGELOG.md`
- Tarball must be under 100KB excluding source maps
- `npm install app-20-llmchat` must resolve and install correctly
- All peer dependencies must be declared, not bundled
