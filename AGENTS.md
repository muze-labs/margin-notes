# Instructions for Coding Agents

This repository is a reference application, a design laboratory for SimplySolid, and the evidence base for *Building Software on Solid Ground*.

## Read first

Before editing, read:

1. `README.md`;
2. `docs/CURRENT_SLICE.md`;
3. `docs/AI_WORKFLOW.md`;
4. `docs/DEMAND_DRIVEN_SIMPLYSOLID.md`;
5. the design, architecture, and data-model documents;
6. `docs/DECISIONS.md` and `docs/OPEN_QUESTIONS.md`;
7. `docs/DESIGN_PRESSURES.md` and `docs/SIMPLYSOLID_FEATURES.md`.

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
- require residential overlays without explicit opt-in;
- force a Muze library into the application merely for coverage;
- rewrite accepted project decisions without implementation evidence;
- mark a feature validated because unit tests pass.

## Cross-repository work

Keep application and `solid-tools` changes in separate commits and preferably separate repositories. Follow `docs/WORKING_WITH_SOLID_TOOLS.md`.

An assistant without access to `solid-tools` should leave a complete proposal and failing integration expectation. It must not fake the library capability locally.

## Completion

A task is not complete when code merely runs on the happy path. Add or update tests, document changed assumptions, and keep the current slice usable end to end.

For a shared-library capability, completion has two stages:

- **Implemented:** the owning library has contract tests.
- **Validated:** this application uses it in the intended end-to-end path.
