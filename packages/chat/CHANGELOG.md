# Changelog

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