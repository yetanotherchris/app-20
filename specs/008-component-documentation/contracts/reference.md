# Reference Contract

The documentation reference is generated from a checked-in public-surface list that mirrors `packages/chat/src/index.ts`. Every entry has an identifier, description, required/optional classification, default, host contract, usage example, and target version. The verification script fails when a listed root export is missing from the source entry point or when a required section/claim is absent.

The reference categories are:

- `Chat` controlled inputs and callbacks
- session hook options, state, controls, and operation guarantees
- message roles, statuses, chat statuses, and text content parts
- themes, semantic tokens, accessibility overrides, renderers, controls, icons, actions, capabilities, and labels
- scroll, unread, autogrow, and focus helpers
- safe rendering and host-owned side effects

The reference intentionally excludes internal file paths as consumer imports and excludes unsupported image, attachment, tool-call, network, and product-shell features.
