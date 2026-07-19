# Solid Margin Notes

A reference application for learning how to build small, interoperable Solid applications with the Muze software stack.

This repository exists before the accompanying book does. The application is intended to reveal the real design problems first, so that *Building Software on Solid Ground* can explain solutions that have already survived implementation.

## Relationship to the books

- *Programming for Wizards* explains why Muze is betting on Solid, linked data, replaceable applications, and user-controlled software.
- *Building Software on Solid Ground* will explain how to build that kind of software.
- This repository is the working reference implementation used to discover and test the material for the second book.
- The margin-notes component is the concrete example from *Programming for Wizards*: private reader notes first, stable passage addresses, linked meanings, user-owned storage, and deliberate sharing.

## Product in one paragraph

The project will provide an embeddable margin-notes component that a site can load with a script tag. Readers can attach notes to stable parts of a page, keep them in browser storage, optionally store them in their Solid Pod, combine their private notes with public note collections, and submit selected notes to a configurable inbox. The component must remain useful outside the original book website.

## Current status

Implementation has started for the first local slice. The current code exposes the `margin-notes` package, mounts a SimplyFlow app through `MarginNotes.mount(config)`, attaches quiet note affordances to host-supplied anchors, opens the Cobalt editor, and saves/restores OLDMed annotation subjects through a small browser-local store.

The first implementation milestone is still in progress. The current storage shape uses OLDM-style `prefix$predicate` names without importing OLDM itself. The default local store is backed by IndexedDB, but the app-facing store API only stores opaque values by key. The automated tests now cover the annotation model, local store, executable host contract used by the component, and headless browser create/restore/edit/delete plus keyboard-access paths against the mounted public API.

The package name is `margin-notes`.

## Guiding principles

1. Build the application before writing the tutorial around it.
2. Keep the data independent from the application.
3. Use native linked data rather than mapping it into a closed application model.
4. Preserve facts the application does not understand.
5. Keep storage, transport, presentation, and application policy separate.
6. Make Solid optional at first, but do not create a second data model for local storage.
7. Prefer small replaceable parts over a framework that owns the whole application.
8. Treat errors, permissions, partial data, and network failure as ordinary states.
9. Clearly distinguish Solid standards, established conventions, Muze conventions, and experiments.
10. Record unexpected design discoveries while they are still fresh.
11. Treat the application as evidence for SimplySolid, not as a reason to implement its roadmap in advance.
12. Distinguish designed, required, implemented, and application-validated capabilities.
13. Warn before accepting changes that move away from the *Programming for Wizards* touchstone.

## Repository map

- [`docs/REASON_FOR_EXISTENCE.md`](docs/REASON_FOR_EXISTENCE.md) — why this project comes before the book
- [`docs/DESIGN.md`](docs/DESIGN.md) — product and interaction design
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — proposed system boundaries
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — initial linked-data model
- [`docs/PROGRAMMING_FOR_WIZARDS_TOUCHSTONE.md`](docs/PROGRAMMING_FOR_WIZARDS_TOUCHSTONE.md) — the book's why applied to this component
- [`docs/MUZE_DESIGN_PRINCIPLES.md`](docs/MUZE_DESIGN_PRINCIPLES.md) — Muze design principles applied to this project
- [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) — vertical milestones
- [`docs/CURRENT_SLICE.md`](docs/CURRENT_SLICE.md) — the one active end-to-end slice
- [`docs/DEMAND_DRIVEN_SIMPLYSOLID.md`](docs/DEMAND_DRIVEN_SIMPLYSOLID.md) — how application needs may change SimplySolid
- [`docs/DESIGN_PRESSURES.md`](docs/DESIGN_PRESSURES.md) — observed pressure on application and library boundaries
- [`docs/SIMPLYSOLID_FEATURES.md`](docs/SIMPLYSOLID_FEATURES.md) — designed, required, implemented, and validated states
- [`docs/proposals/`](docs/proposals/) — evidence-based shared-library proposals
- [`docs/WORKING_WITH_SOLID_TOOLS.md`](docs/WORKING_WITH_SOLID_TOOLS.md) — cross-repository workflow
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — accepted and proposed design decisions
- [`docs/OPEN_QUESTIONS.md`](docs/OPEN_QUESTIONS.md) — unresolved questions worth testing
- [`docs/STACK_ASSUMPTIONS.md`](docs/STACK_ASSUMPTIONS.md) — expected roles of Muze libraries
- [`docs/BOOK_FEEDBACK_LOOP.md`](docs/BOOK_FEEDBACK_LOOP.md) — how implementation discoveries become book material
- [`docs/AI_WORKFLOW.md`](docs/AI_WORKFLOW.md) and [`AGENTS.md`](AGENTS.md) — rules for AI-assisted work
- [`docs/SECURITY_AND_PRIVACY.md`](docs/SECURITY_AND_PRIVACY.md) — trust and privacy constraints
- [`docs/TEST_STRATEGY.md`](docs/TEST_STRATEGY.md) — what the reference implementation must prove

## Immediate next step

Finish the slice in [`docs/CURRENT_SLICE.md`](docs/CURRENT_SLICE.md) without Solid integration. The next work should close the remaining local gaps: exercise the real component in browser tests, verify the browser-storage round trip for the OLDMed annotation graph, and keep the working path small enough to teach. Do not implement SimplySolid until an active slice produces evidence for a missing capability.

## Licence

MIT. Copyright muze.nl.
