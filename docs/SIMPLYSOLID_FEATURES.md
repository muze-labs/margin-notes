# SimplySolid Feature States

This file tracks how far each SimplySolid idea has progressed in this application. It prevents a design sketch from being mistaken for working or validated software.

## States

- **Designed** — described in the SimplySolid design, but not demanded here
- **Required** — an active application slice has produced a design pressure for it
- **Implemented** — available in `solid-tools` with contract tests
- **Validated** — used successfully by an end-to-end margin-notes path
- **Rejected** — implementation evidence showed that the feature or boundary was wrong

A feature normally moves through the states in order. A prototype may be implemented while investigating, but it should not be recorded as part of the supported design until the required evidence exists.

## Feature matrix

| Capability | State | First expected slice | Design pressure | Library evidence | Application evidence | Notes |
|---|---|---|---|---|---|---|
| Workspace over explicitly named resources | Designed | Milestone 3 | — | — | — | Do not implement before the application reaches Solid storage. |
| Resource descriptors and shorthand inputs | Designed | Milestone 3 | — | — | — | Exact API remains provisional. |
| Source provenance for loaded subjects | Designed | Milestone 3 or 4 | — | — | — | Must be observable in the application, not only internal metadata. |
| Read-only source handling | Designed | Milestone 4 | — | — | — | Public-note coexistence should drive it. |
| Shaped collection view | Designed | Milestone 4 | — | — | — | Shapes match and optionally validate; they do not map. |
| Add resources after workspace creation | Designed | Milestone 4 | — | — | — | Optional source selection may require it. |
| Container loading, non-recursive by default | Designed | Milestone 4 or 5 | — | — | — | Only implement if discovery uses containers. |
| Configurable recursive container loading | Designed | Later | — | — | — | No current margin-notes need. |
| `createIn` as resource URL | Designed | Milestone 3 | — | — | — | New-note storage should provide evidence. |
| `createIn` as synchronous function | Designed | Milestone 4 | — | — | — | Do not add until more than a fixed target is needed. |
| Default fragment identity sequence | Designed | Milestone 3 | — | — | — | Test against actual note creation and resource layout. |
| Save existing subjects to original sources | Designed | Milestone 3 | — | — | — | Requires round-trip evidence. |
| Per-resource save results | Designed | Milestone 3 or 4 | — | — | — | Partial failure should drive the exact result shape. |
| `saveAll()` throwing convenience | Designed | Later | — | — | — | Convenience only; not needed for the first save path. |
| Preserve unknown predicates and extra types | Designed | Milestone 3 | — | — | — | Must have a round-trip fixture before validation. |
| Enrich read-only data in a writable target | Designed | Milestone 4 | — | — | — | Public/private note combination should drive it. |
| Prevent moves by default | Designed | Later | — | — | — | Implement only when a move can actually occur. |
| Notifications exposing original message | Designed | Milestone 7 | — | — | — | No automatic reload or merge. |

## Updating this file

When a feature becomes **Required**, add the design-pressure ID. When it becomes **Implemented**, link the `solid-tools` tests or commit. When it becomes **Validated**, link the application test or example.

Do not mark a broad row validated when the application has exercised only a narrower case. Split the row when necessary.
