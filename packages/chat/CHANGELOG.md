# Changelog

## 0.3.0 (2026-09-08)

- Streaming and operations (spec 006): a `useChatSession` hook owns the
  conversation's messages, chat status, and per-operation identity. It streams
  response chunks incrementally, rejects updates from superseded operations,
  retains partial content on stop with an idempotent second stop, replaces
  failed or completed responses in place on retry and regenerate, suppresses
  duplicate send events, and wires per-message copy, retry, and regenerate
  actions. The `Chat` component itself is unchanged.

## 0.2.0 (2026-09-08)

- Accessibility (spec 005): WCAG 2.2 AA for the default surface. Message rows
  are keyboard focusable with a visible focus ring on every control; status is
  conveyed by glyph and label, never color alone; reduced-motion and
  high-contrast system settings are honored; touch targets are at least 24 CSS
  pixels on web and 44 points on iOS; the layout reflows at 200% zoom. The
  default themes pass WCAG contrast ratios, enforced by a unit test, and an
  automated axe scan runs in the e2e suite.

## 0.1.0 (2026-09-07)

- Initial release of the shared chat component surface from specs 001-003:
  message list, message rendering, and composer.
- Theme and customization system (spec 004): light/dark/system themes with
  semantic tokens and per-surface style overrides; replaceable message,
  content, and Markdown element renderers; replaceable Send, Stop, and
  scroll-to-latest controls; composer controls; grouped message actions;
  replaceable empty/loading/typing/error states; application icons; and
  disabled/read-only/capability constraint modes. A top-level `Chat`
  component composes the surface and owns the theme context.
