# Contract: Chat Autosave

## Renderer Session

`useShellSession` no longer exposes editor-derived `dirty`, `saving`, or `save` members. It exposes session state and transition methods that coordinate autosave internally.

```ts
interface ShellSession {
  messages: readonly Message[]
  draft: string
  status: ChatStatus
  messageActions: readonly MessageAction[]
  setDraft(value: string): void
  submit(): void
  stop(): void
  newConversation(): Promise<AppErrorCode | null>
  openConversation(id: string): Promise<AppErrorCode | null>
  onMessageAction(action: MessageAction, message: Message): void
}
```

`newConversation` and `openConversation` return an error code only when an in-session flush blocks replacing the active session. A close-time flush never blocks exit.

## Main-to-renderer Events

The existing close request remains. The following event is added to the typed event contract and fixed preload API.

```ts
'app:backgrounded': Record<string, never>
```

The bridge exposes:

```ts
onAppBackgrounded(handler: () => void): () => void
```

The main window sends the event when it blurs. The renderer requests a session flush.

## Close Decision

The existing `app:close-decision` request continues to accept only `close` or `cancel`. Spec 107 uses only `close`: the renderer sends it after its final persistence attempt. The application has no renderer control that sends `cancel`.

## Menu Commands

`MenuCommand` excludes `save-document`. The application menu has no Save label or save accelerator.
