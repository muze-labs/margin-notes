# Instructions for Coding Agents

This repository is a reference application, a design laboratory for SimplySolid, and the evidence base for *Building Software on Solid Ground*.

## Read first

Before editing, read:

1. `README.md`;
2. `docs/CURRENT_SLICE.md`;
3. `docs/AI_WORKFLOW.md`;
4. `docs/DEMAND_DRIVEN_SIMPLYSOLID.md`;
5. `docs/PROGRAMMING_FOR_WIZARDS_TOUCHSTONE.md`;
6. `docs/MUZE_DESIGN_PRINCIPLES.md`;
7. the design, architecture, and data-model documents;
8. `docs/DECISIONS.md` and `docs/OPEN_QUESTIONS.md`;
9. `docs/DESIGN_PRESSURES.md` and `docs/SIMPLYSOLID_FEATURES.md`.

The current slice outranks speculative future milestones.

## Priorities

1. Deliver the smallest working vertical slice.
2. Keep one native linked-data model across browser and Solid storage.
3. Preserve subject identity, source provenance, and unknown predicates.
4. Keep presentation components free of resource-location and authentication policy.
5. Treat permission, network, partial-save, and unresolved-target states as normal.
6. Keep Solid optional until the Solid milestone; local operation must remain useful afterward.
7. Label standards, conventions, library behaviour, and experiments accurately.
8. Record design discoveries while evidence is fresh.
9. Apply Muze design principles: simplicity, small decoupled libraries, correct boundaries, browser-native standards, lightweight abstractions, stable APIs, replaceability, open hosting paths, small software, and view-source-friendly code.
10. Treat `@muze-nl` as a production-readiness signal and `@muze-labs` as the place for experimental libraries.
11. Keep the margin-notes app aligned with the why from *Programming for Wizards*: private notes first, user-owned storage, stable passage addresses, linked meanings, deliberate sharing, and replaceable tools.
12. Warn before implementing a change that would make the app veer away from that touchstone.

## SimplySolid rule

Do not implement a SimplySolid feature solely because it appears in a design document.

A new shared-library capability requires:

- a concrete need from the active application slice;
- a design-pressure entry;
- an attempted use of the current stack;
- a boundary decision;
- a small proposal under `docs/proposals/`;
- library contract tests;
- an application integration test;
- end-to-end validation before the feature is called validated.

Prefer application code until duplication, boundary leakage, loss of provenance, or incorrect save ownership demonstrates that the behaviour belongs in a library.

## Stopping rules

Record an idea instead of implementing it when:

- the active slice does not need it;
- the proposal has no failing application test;
- a value or synchronous function would serve the demonstrated case;
- it requires a generic provider, plugin, strategy, or callback system for hypothetical callers;
- it hides Solid, WAC, ACP, HTTP, or resource semantics the application must understand;
- it maps linked data into a closed application-owned duplicate model;
- it depends mainly on other unimplemented roadmap features.

## Do not

- build a universal abstraction before one application needs it;
- copy experimental SimplySolid code into this repository;
- add application-specific options to SimplySolid;
- add a central service;
- silently migrate or publish notes;
- close the data model around one application's shape;
- make the book or component the owner of a reader's private margin;
- treat sharing a note as the default consequence of writing one;
- make Solid required for the first useful local note-taking path;
- require residential overlays without explicit opt-in;
- force a Muze library into the application merely for coverage;
- rewrite accepted project decisions without implementation evidence;
- mark a feature validated because unit tests pass.
- publish or rename an experimental package under `@muze-nl` without release-readiness evidence.

## Cross-repository work

Keep application and `solid-tools` changes in separate commits and preferably separate repositories. Follow `docs/WORKING_WITH_SOLID_TOOLS.md`.

An assistant without access to `solid-tools` should leave a complete proposal and failing integration expectation. It must not fake the library capability locally.

## Completion

A task is not complete when code merely runs on the happy path. Add or update tests, document changed assumptions, and keep the current slice usable end to end.

For a shared-library capability, completion has two stages:

- **Implemented:** the owning library has contract tests.
- **Validated:** this application uses it in the intended end-to-end path.
