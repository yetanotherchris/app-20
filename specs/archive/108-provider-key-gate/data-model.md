# Data Model: Provider Key Gate

## Existing Values

| Value                       | Owner                  | Meaning                                                                       |
| --------------------------- | ---------------------- | ----------------------------------------------------------------------------- |
| `SecretsStatus.providerKey` | Main process, spec 103 | `true` when a valid stored provider key or valid `OPENROUTER_API_KEY` exists. |
| Composer draft              | `useShellSession`      | Text that remains unchanged until `submit` begins a chat operation.           |
| Import result               | Main process, spec 103 | Success, chooser cancellation, or a typed import error.                       |

## Submit Transitions

| Current condition                              | Action                                             | Result                                                    |
| ---------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------- |
| Empty draft or unavailable conversation folder | Do not submit                                      | Draft remains unchanged.                                  |
| Available provider key                         | Call `session.submit`                              | Existing chat flow starts and clears the submitted draft. |
| No provider key, import succeeds               | Report successful import and call `session.submit` | The initial user-initiated send proceeds.                 |
| No provider key, import is cancelled or fails  | Report only non-cancellation error                 | Draft remains unchanged; no provider request starts.      |
| Key disappears after availability check        | Existing `chat:start` returns `missing-key`        | Existing error/retry handling retains the prompt.         |
