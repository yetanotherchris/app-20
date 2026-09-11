# Quickstart: Provider Key Gate

1. Run `npm run test:e2e -- provider-key-gate.spec.ts` from the repository root.
2. Confirm a fresh shell opens the file chooser on first submit and the fake provider receives no request.
3. Confirm chooser cancellation leaves the composer value in place and sends nothing.
4. Confirm a valid imported key continues the initial submit and reaches the fake provider.
5. Confirm an `OPENROUTER_API_KEY` skips the chooser and reaches the fake provider.
