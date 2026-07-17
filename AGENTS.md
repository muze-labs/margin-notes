# Instructions for Coding Agents

This repository is a reference application and design laboratory for *Building Software on Solid Ground*.

## Read first

Read `README.md`, `docs/AI_WORKFLOW.md`, the design and architecture documents, the decision log, and the active milestone before editing.

## Priorities

1. Deliver the smallest working vertical slice.
2. Keep one native linked-data model across browser and Solid storage.
3. Preserve subject identity, source provenance, and unknown predicates.
4. Keep presentation components free of resource-location and authentication policy.
5. Treat permission, network, partial-save, and unresolved-target states as normal.
6. Keep Solid optional until the Solid milestone; local operation must remain useful afterward.
7. Label standards, conventions, library behaviour, and experiments accurately.
8. Record design discoveries in `docs/DECISIONS.md`, `docs/OPEN_QUESTIONS.md`, or `docs/BOOK_NOTES.md` as appropriate.

## Do not

- build a universal abstraction before one application needs it;
- add a central service;
- silently migrate or publish notes;
- close the data model around one application's shape;
- require residential overlays without explicit opt-in;
- force a Muze library into the application merely for coverage;
- rewrite accepted project decisions without implementation evidence.

## Completion

A task is not complete when code merely runs on the happy path. Add or update tests, document changed assumptions, and keep the current milestone usable end to end.
