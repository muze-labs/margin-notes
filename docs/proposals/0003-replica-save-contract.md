# Replica save and sync contract

Active slice: M3.2. Design pressure: DP-006. Opened: 2026-10-30.

A reader must be able to edit or delete a connected note, reload, and retain
the result. Saving during a sync must retain the newer local edit. Failed local
commits must not be reported as saved; failed remote writes must leave a useful
local note and visible pending state.

The current workspace API was exercised directly in `replicas.test.mjs`.
All four initial cases failed: edits accumulated old scalar values, deleted
notes returned, remote-only additions were not persisted locally, and a save
during a held remote write was overwritten. `persistence.test.mjs` also exposed
loss of cyclic RDF structure and ignored adapter failures. IndexedDB tests
exposed completion at request success instead of transaction commit.

The owners are the existing persistence and replica boundaries in
solid-workspace. UI locks or app-owned merges would leave those contracts broken
for other callers. SimplySolid must preserve their failure results.

Implement the existing minimal single-user sync draft: persisted Turtle
deletion markers using PDS Interop `https://purl.org/pdsinterop/link-metadata#deleted`,
`dcterms:modified`, and explicitly configured scalar predicate IRIs
on a logical resource. Unknown predicates remain additive. The library must not
know annotation or Cobalt predicates. The application supplies the scalar set
and timestamps its body edits. Subject deletion does not imply ownership or
garbage collection of linked subjects. Deleting an annotation hides that note;
unreferenced body/target facts may remain.

Keep the additive source import API distinct from logical-resource sync.
Sequence persistence within a resource and detect saves admitted while a sync
is awaiting I/O. Such a sync must leave the newer local state pending instead
of replacing it with its snapshot. Rejected operations must not poison later
retries. Awaited IndexedDB operations complete only when the transaction does.

No CRDT, automatic blank-node identity reconciliation, cross-tab locking,
authentication redesign, permission changes, or publication is included.
Timestamp conflicts use deterministic last-writer-wins only for declared
scalars. Remote concurrent writes still need conditional HTTP validation before
claiming multi-device concurrency safety.

Library evidence: transaction abort, cyclic/shared RDF and collection round
trips, edit/delete/reopen, remote-only changes, save during sync, failed adapter
results, and SimplySolid failure propagation. Application evidence must include
connected edit/delete/remount and a failed remote write with a durable local
note. Fake-client evidence does not establish real-Pod authentication.
