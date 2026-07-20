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
| Workspace over explicitly named resources | Validated | Milestone 3 | DP-004 | `packages/solid-workspace/test/index.test.mjs` | `test/browser-mounted.test.js` | Margin-notes uses one logical `notes` resource with local and remote replicas. Broader multi-resource views remain only designed. |
| Local-first resource descriptors | Validated | Milestone 3 | DP-004 | `packages/simplysolid/test/index.test.mjs` | `test/browser-mounted.test.js` | The default notes resource opens without a Solid client and later connects to a Solid resource URL. |
| Resource descriptors and shorthand inputs | Implemented | Milestone 3 | DP-004 | `packages/simplysolid/test/index.test.mjs` | `test/browser-mounted.test.js` | Validated only for the `resources: { notes: { url } }` connect shape. |
| Source provenance for loaded subjects | Designed | Milestone 3 or 4 | — | — | — | Must be observable in the application, not only internal metadata. |
| Read-only source handling | Designed | Milestone 4 | — | — | — | Public-note coexistence should drive it. |
| Shaped collection view | Implemented | Milestone 4 | DP-004 | `packages/simplysolid/test/index.test.mjs` | — | Implemented in the library; margin-notes currently uses unshaped OLDMed annotation objects. |
| Add resources after workspace creation | Validated | Milestone 4 | DP-004 | `packages/simplysolid/test/index.test.mjs` | `test/browser-mounted.test.js` | Solid connect adds the remote replica after the local resource already exists. |
| Container loading, non-recursive by default | Designed | Milestone 4 or 5 | — | — | — | Only implement if discovery uses containers. |
| Configurable recursive container loading | Designed | Later | — | — | — | No current margin-notes need. |
| `createIn` as resource URL | Designed | Milestone 3 | — | — | — | New-note storage should provide evidence. |
| `createIn` as synchronous function | Designed | Milestone 4 | — | — | — | Do not add until more than a fixed target is needed. |
| Default fragment identity sequence | Designed | Milestone 3 | — | — | — | Test against actual note creation and resource layout. |
| Save existing subjects to original sources | Validated | Milestone 3 | DP-004 | `packages/simplysolid/test/index.test.mjs` | `test/browser-mounted.test.js` | Validated for local resource saves and local-to-remote resource sync. |
| Per-resource save results | Implemented | Milestone 3 or 4 | DP-004 | `packages/solid-workspace/test/index.test.mjs` | `test/browser-mounted.test.js` | App observes `sync('notes')` success/failure at the logical resource level. More UI nuance remains future work. |
| `saveAll()` throwing convenience | Validated | Later | DP-004 | `packages/simplysolid/test/index.test.mjs` | `test/browser-mounted.test.js` | Used by the app's `saveNotes()` compatibility action for tracked local resource records. |
| Preserve unknown predicates and extra types | Validated | Milestone 3 | DP-004 | `packages/solid-workspace/test/index.test.mjs` | `test/browser-mounted.test.js` | Mounted local edit/save coverage preserves unknown annotation and body facts through the SimplySolid path. |
| Enrich read-only data in a writable target | Designed | Milestone 4 | — | — | — | Public/private note combination should drive it. |
| Prevent moves by default | Designed | Later | — | — | — | Implement only when a move can actually occur. |
| Notifications exposing original message | Designed | Milestone 7 | — | — | — | No automatic reload or merge. |

## Updating this file

When a feature becomes **Required**, add the design-pressure ID. When it becomes **Implemented**, link the `solid-tools` tests or commit. When it becomes **Validated**, link the application test or example.

Do not mark a broad row validated when the application has exercised only a narrower case. Split the row when necessary.
