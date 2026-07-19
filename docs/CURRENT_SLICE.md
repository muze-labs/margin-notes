# Current Implementation Slice

Keep exactly one primary slice active. AI assistants and contributors should read this file before proposing code.

## Slice M3.1 — Save notes to one configured Solid resource

**Status:** In progress  
**Milestone:** 3 — Solid connection and storage

## User-visible outcome

A host page can configure a Solid resource URL and, when needed, inject a Lading-style Solid client. The margin-notes app loads the same note graph from that resource, lets the reader create, edit, and delete notes, and saves the graph back to the configured resource.

Browser-local notes must continue to work without Solid.

## Current implementation state

The app already has a small store boundary: `load({ key })`, `save({ key, value })`, and `remove({ key })` over opaque graph documents. The default implementation uses IndexedDB. The Solid implementation adds `createSolidResourceStore()`, which implements the same boundary with Lading resource operations against one configured resource URL.

The Solid resource adapter translates the app-facing graph document to and from Turtle using OLDM. This is still intentionally narrow: it exercises Solid resource ownership, linked-data parsing/writing, and HTTP persistence through the Muze Solid stack without introducing login, discovery, or source-aware multi-resource work.

## Why this slice comes next

The local slice proved the note UI, annotation identity, target identity, Cobalt body representation, linked-data-like object shape, browser persistence, and unknown-predicate preservation. The next question is whether that same application model can cross the Solid boundary without rewriting note code or adding a broad workspace abstraction too early.

## Accepted constraints

- Keep local browser storage available and unchanged.
- Use the existing store contract.
- Configure exactly one Solid resource URL.
- Accept an injected Lading-style Solid client and otherwise create a `jsfs-solid` Metro client with Metro-OLDM enabled by default.
- Do not implement login UI in this slice.
- Save the configured Solid resource as Turtle while keeping the current app-facing graph document shape.
- Treat the adapter as application evidence, not a SimplySolid capability.
- Preserve unknown facts represented in the app-facing graph document.

## Explicit non-goals

- Solid login;
- storage discovery;
- type indexes;
- WAC or ACP permission UI;
- inboxes, submission, or publication;
- public/private multi-source views;
- per-subject source provenance;
- source-aware multi-resource OLDM modelling;
- robust target reattachment;
- real-server conformance claims beyond a later smoke test.

## Acceptance evidence

The slice is complete when tests demonstrate:

1. the Solid resource adapter loads Turtle from a configured resource through a Lading-style resource client;
2. missing resources load as an empty note graph;
3. saves use `PUT` with a clear Turtle content type;
4. failed saves report the HTTP failure;
5. deletion uses `DELETE` and treats already-missing resources as removed;
6. the mounted app can create a note, save through the adapter, remount, and restore from the same resource;
7. no SimplySolid package capability was added without a new design pressure.

## Questions this slice should answer

- How long can the current store boundary remain useful?
- What failure information does the app need to show the reader?
- Is one Turtle resource enough for a first private Solid notes file?
- What evidence would force source-aware workspace semantics into SimplySolid?
- What must change before a real Solid server smoke test is meaningful?

## Expected documents to update

- `docs/DATA_MODEL.md`
- `docs/DECISIONS.md`
- `docs/DESIGN_PRESSURES.md`
- `docs/BOOK_NOTES.md`
- `docs/STATUS.md`
- `docs/SIMPLYSOLID_FEATURES.md` if a SimplySolid capability becomes required, implemented, or validated.
