# Current Implementation Slice

Keep exactly one primary slice active. AI assistants and contributors should read this file before proposing code.

## Slice M3.2 — Local-first notes with a Solid replica

**Status:** In progress  
**Milestone:** 3 — Solid connection and storage

## User-visible outcome

A reader can create, edit, delete, reload, and keep notes locally before connecting to Solid. When they connect, the app discovers the per-page Solid notes resource and asks SimplySolid to attach it as the remote replica for the same local-first notes resource. Local and remote notes are then synced through the workspace resource API.

## Current implementation state

The default storage path now creates a SimplySolid service with one local-first `notes` resource. Its local replica is an IndexedDB graph resource in the `margin-notes-workspace` database. Custom host stores exchange Turtle through a workspace source adapter. The old app-owned IndexedDB store and migration path have been removed.

The Solid connection flow still lives in the margin-notes app because it owns the reader-facing WebID control and per-page resource discovery. Once a resource URL is discovered, margin-notes passes the Solid API client and URL to `notesService.connect({ resources: { notes: { url }}})` and calls `notesService.sync('notes')`. The app no longer merges local and remote graphs itself.

## Why this slice comes next

Real browser testing made the next boundary visible: the reader may use a PWA-style app with no network, then later connect to Solid. Treating the local note document and the remote Turtle file as two replicas of one logical workspace resource keeps the open-world model in the shared stack instead of growing application-specific merge code.

## Accepted constraints

- Keep notes usable before Solid is connected.
- Keep custom host stores working through the small Turtle load/save boundary.
- Keep margin-notes code focused on note UI, annotation shaping, connection UI, and resource discovery.
- Let SimplySolid/solid-workspace own local resource persistence, resource replicas, graph merge, and resource sync.
- Use OLDMed annotation subjects as the common object shape across local and Solid-backed paths.
- Preserve unknown facts represented in the stored graph.
- Do not introduce public note sources, submission inboxes, or source-level editing UI yet.

## Explicit non-goals

- type indexes;
- WAC or ACP permission UI;
- inboxes, submission, or publication;
- public/private multi-source views;
- per-subject source provenance;
- robust target reattachment;
- real-server conformance claims beyond a later smoke test.

## Acceptance evidence

The slice is complete when tests demonstrate:

1. local notes are created through SimplySolid and survive remount without a Solid connection;
2. custom host stores use the same workspace persistence path;
3. connecting to Solid attaches the discovered resource as the remote replica for the local notes resource;
4. existing local notes and existing remote notes appear together after connection;
5. locally created notes after connection are synced to the remote resource;
6. reconnecting restores notes through the SimplySolid workspace path;
7. margin-notes no longer contains application-specific local/remote graph merge logic.

## Questions this slice should answer

- Is `workspace.sync('notes')` the right application-facing API for a replicated resource?
- Does SimplySolid need an explicit document-level resource save API, or is collection `saveAll()` enough for margin-notes?
- How should pending local changes and remote conflicts become visible to the reader?
- What must change before a real Solid server smoke test is meaningful?

## Expected documents to update

- `docs/DATA_MODEL.md`
- `docs/DECISIONS.md`
- `docs/DESIGN_PRESSURES.md`
- `docs/BOOK_NOTES.md`
- `docs/STATUS.md`
- `docs/SIMPLYSOLID_FEATURES.md` if a SimplySolid capability becomes required, implemented, or validated.

## Latest contract validation

The 2026-09-23 migration consumes full-IRI values from OLDM `341530e` through
solid-tools `003c62c`. All 53 application tests pass, including the mounted
local and fake-Solid persistence/sync paths. This preserves the slice's existing
boundaries; it does not close the outstanding real-server validation question.

## Replica contract repair — 2026-10-30

The default connection now passes the Solid client and resource URL directly to
SimplySolid. Workspace owns Turtle conversion, timestamps/scalar merge,
tombstones, save/open/sync ordering, and transaction completion. The app declares
the body fragment link as editable and `oa:hasBody` as ownership; only the
annotation carries a modification timestamp. It reads public
resource status rather than reaching into workspace resource maps.

The mounted browser path now covers connected creation, replacement of body
text, deletion, remount/reconnect, and a failed remote write followed by a local
remount. The UI says “Saved on this device. Solid sync pending” after a failed
remote write. Connection status is published after the loaded notes are installed.

Remaining: disposable real-Pod authentication/permission testing, conditional
remote writes and cross-tab concurrency, and OLDM graph-removal support. This repair does not declare the entire stack finished.


The repaired application path also passes all 57 tests against the npm releases
listed in `STATUS.md`. Cobalt remains the sole sibling-checkout build dependency
while its scoped packages are pending publication. Registry installation replaces
the SimplyFlow resolver and local Solid Tools/OLDM links; it does not broaden the
fake-Solid test evidence into real-Pod validation.

## Native fragment storage — 2026-10-30

Cobalt text and formatting now persist as native RDF, including an ordered
annotation Collection. The application bridge consumes Cobalt's existing value
API; Cobalt has no RDF/Turtle dependency. Each edit replaces the current fragment's
text and formatting together, preserving unknown facts and preventing old formatting
from reappearing during replica sync. No revision history is stored. See
`COBALT_RDF.md` and D053.


The current shape (D054) exposes generated HTML as a standard OA TextualBody,
while the annotation also links directly to its editable Cobalt fragment. The
fragment links to its HTML representation with dcterms:hasFormat. Existing
body-to-fragment test data is not migrated.
