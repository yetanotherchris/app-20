# Data Model: Component Documentation

## DocumentationVersion

- `id`: version path segment, currently `v0.3.0`
- `packageVersion`: package version, currently `0.3.0`
- `status`: current or archived
- `changelog`: release changes
- `migration`: behavior-affecting and breaking migration notes

## NavigationEntry

- `id`: stable anchor
- `label`: visible navigation label
- `description`: short purpose statement
- `section`: installation, examples, concepts, recipes, reference, accessibility, platform, or release

## ReferenceEntry

- `category`: inputs, events, states, statuses, content, hooks, themes, renderers, controls, actions, capabilities, or types
- `identifier`: public export or prop name
- `description`: plain-language behavior
- `required`: required or optional
- `defaultValue`: default or none
- `hostContract`: what the host supplies or receives and when
- `example`: minimal usage snippet
- `version`: target version

## Recipe

- `id`: stable anchor
- `title`: integration task
- `assumptions`: required host setup
- `code`: complete copyable example
- `expectedBehavior`: result after applying the recipe
- `version`: target version

## LiveExample

- `id`: stable example identifier
- `capabilities`: operations exercised
- `component`: the actual `ChatDemo` instance
- `verificationControl`: deterministic control used by tests

## VerificationResult

- `kind`: export, claim, version, build, link, or browser
- `target`: checked item
- `passed`: boolean
- `details`: diagnostic text
