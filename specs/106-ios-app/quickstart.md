# iOS Validation Guide

## Prerequisites

1. Specs 107 and 108 are merged to `main`.
2. An Expo-compatible Node environment and EAS credentials are available.
3. A physical iPhone is available for the native checklist.
4. Test provider and S3 credential files contain non-production values.

## Automated Checks

Run the repository lint, typecheck, and unit suites. Run the Electron Playwright suite to confirm the shared behavior remains integrated. Run iOS adapter tests through the root Vitest configuration or the iOS workspace script added during implementation.

## Physical iPhone Checklist

1. Install the EAS internal build and confirm all shell content respects notch and home-indicator safe areas.
2. With no provider key, type a prompt and send. Confirm the document picker opens, cancellation retains the draft, and successful import automatically sends it.
3. Confirm software keyboard, hardware keyboard, and an IME do not send during composition. Confirm touch Return inserts a newline.
4. Confirm composer growth reaches internal scrolling on a small screen and messages remain selectable.
5. Set the largest Dynamic Type size and confirm chat content and controls are readable without clipping.
6. During streaming, scroll away and back, then stop. Confirm the retained partial response matches desktop behavior.
7. Background the app while streaming and while an idle-draft timer is pending. Reopen and confirm the partial response and draft persist.
8. Import S3 credentials, create a conversation, allow sync, then verify the matching JSON objects and manifest exist in the configured bucket.
