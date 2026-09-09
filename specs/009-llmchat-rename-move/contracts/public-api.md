# Public API Contract: app-20-llmchat

**Package**: `app-20-llmchat` v1.0.0

## Main Export

```typescript
import LLMChat from 'app-20-llmchat'
// or
import { LLMChat } from 'app-20-llmchat'
```

## Component Namespace

```typescript
LLMChat.Root          // Main container component (was Chat)
LLMChat.Conversation  // Message list (was MessageList)
LLMChat.PromptInput   // Composer/text input (was Composer)
LLMChat.Bubble        // Individual message bubble (was MessageBubble)
LLMChat.Status        // Message status badge (was MessageStatusBadge)
LLMChat.SendButton    // Send action button
LLMChat.StopButton    // Stop generation button
LLMChat.ScrollToLatest // Scroll-to-bottom control (was ScrollToLatestControl)
LLMChat.LoadEarlier   // Load older messages control (was LoadEarlierControl)
LLMChat.UnreadBadge   // Unread count badge
LLMChat.EmptyState    // Empty conversation state
LLMChat.LoadingState  // Loading indicator
LLMChat.TypingState   // Typing indicator
LLMChat.ErrorState    // Error display state
```

## Usage Example

```tsx
import { LLMChat } from 'app-20-llmchat'

function ChatView() {
  return (
    <LLMChat.Root messages={messages} onSend={handleSend}>
      <LLMChat.Conversation />
      <LLMChat.PromptInput />
    </LLMChat.Root>
  )
}
```

## Peer Dependencies

```json
{
  "react": "^19.0.0",
  "react-native": "^0.86.0",
  "react-native-web": "^0.21.0"
}
```

## TypeScript Requirements

- Strict mode enabled
- All exported components and types must have explicit type annotations
- No `any` types in the public API surface
- Component prop types exported as `{ComponentName}Props` (e.g., `LLMChatRootProps`)

## Package Entry Points

```json
{
  "main": "dist/index.js",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "development": "./src/index.ts",
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  }
}
```
