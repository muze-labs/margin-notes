# Design Pressures

This log records concrete pressure from the application on the current stack. It is not a wishlist for SimplySolid.

A design pressure begins when an active application slice encounters a real boundary problem. It ends when the problem is resolved in the correct layer and demonstrated by tests.

## Status values

- **Observed** — the active slice exposed a concrete problem
- **Investigating** — small alternatives or experiments are in progress
- **Proposed** — an owning layer and smallest change have been proposed
- **Resolved in application** — no shared-library change was needed
- **Resolved in component** — solved in the reusable margin-notes component
- **Resolved in library** — a shared-library change was implemented
- **Validated** — the application uses the result end to end
- **Closed** — the original pressure was based on a mistaken assumption or disappeared

## Index

| ID | Status | Active slice | Pressure | Owning layer | Evidence |
|---|---|---|---|---|---|
| DP-000 | Closed | Repository setup | Establish a demand-driven process before SimplySolid implementation begins. | Project workflow | `docs/DEMAND_DRIVEN_SIMPLYSOLID.md` |
| DP-001 | Resolved in application | M1.1 | Browser persistence should not leak its backing mechanism into note code. | Application | `src/storage/local-store.js`, `test/local-store.test.js` |
| DP-002 | Resolved in application | M3.1 | A fixed Solid resource should save the same note graph without creating a second data model. | Application | `src/storage/solid-resource-store.js`, `test/solid-resource-store.test.js`, `test/browser-mounted.test.js` |
| DP-003 | Proposed | M3.2 | Solid login and linked-data storage failures should be surfaced by the Muze libraries before application code writes damaged note graphs. | `solid-tools` packages | `docs/proposals/0001-solid-client-dx.md`, `test/solid-resource-store.test.js`, `test/browser-mounted.test.js` |
| DP-005 | Validated | M3.2 | Full-IRI class/datatype values must survive local/Solid round trips and remain discoverable. | OLDM consumers | `docs/proposals/0002-full-iri-values.md` |
| DP-004 | Validated | M3.2 | PWA-style local notes and later Solid sync should be one logical resource, not app-owned merge code. | SimplySolid / solid-workspace | `test/browser-mounted.test.js`, `@muze-labs/simplysolid` local-first resource tests |

SimplySolid is now required by the default margin-notes storage path. The fixed-resource store adapter remains compatibility and evidence for the lower Solid stack, but local-first resource sync is owned by SimplySolid and solid-workspace.

## DP-001: Local Store Boundary

**Status:** Resolved in application  
**Active slice:** `docs/CURRENT_SLICE.md`  
**Opened:** 2026-07-19

### User-visible need

The reader should create a private note, reload the page, and see that note restored without logging in to Solid.

### Attempt with the current stack

The first implementation wrote the annotation graph directly through `localStorage` from the paragraph-note feature.

### Observable problem

The feature learned the browser storage mechanism and the public names drifted toward implementation-specific terms. That made the teaching code less clear and made a future JSFS-backed local store look like a rewrite.

### Why this is not merely application policy

Choosing private local-first storage is application policy. Knowing whether that storage is `localStorage`, IndexedDB, OPFS, or a JSFS adapter is not part of note rendering or annotation modeling.

### Candidate owning layers

- Application
- Margin-notes component
- JSFS adapter in `solid-tools`

### Smallest experiment

Use a small app-owned store contract with `load`, `save`, and `remove` methods over opaque values. Back the default browser-local store with IndexedDB and keep annotation conversion in the note feature.

### Resolution

Resolved in application for M1.1. A JSFS adapter remains a future option if local and Solid storage need the same file-shaped interface.

### Validation

Unit tests cover the store contract. Browser end-to-end validation remains part of M1.1.

### Book consequence

The book can show that a boundary may start as a tiny application port before it deserves to become a shared library.

## DP-002: Fixed Solid Resource Store Boundary

**Status:** Resolved in application  
**Active slice:** `docs/CURRENT_SLICE.md`  
**Opened:** 2026-07-19

### User-visible need

A reader should be able to configure a known private Solid resource and have margin notes load from and save to that resource, while the browser-local path remains useful.

### Attempt with the current stack

The app already accepts a small `store` object with `load`, `save`, and `remove` methods over opaque graph documents.

### Observable problem

Moving the graph to Solid needs Solid resource operations and linked-data serialization, but the note UI and annotation model do not need to know whether the resource is IndexedDB-backed or loaded from a Pod.

### Why this is not merely application policy

The choice of one fixed resource is application policy for the first Solid slice. The underlying operations are still ordinary Web resource operations, but application code should reach them through the Muze Solid stack: Metro, Metro-OLDM, and Metro-Solid.

### Candidate owning layers

- Application
- Margin-notes component
- SimplySolid
- jsfs-solid

### Smallest experiment

Add a `createSolidResourceStore()` adapter that satisfies the existing store contract against one configured resource URL, using an injected Solid API client when the host already has one and otherwise composing the `jsfs-solid` Metro client stack.

### Resolution

Resolved in application for the first Solid resource slice. The adapter translates the same app-facing graph document used by browser-local storage to and from Turtle, so Solid support does not introduce a second note model. The default client composition goes through `createSolidMetroClient()`, which keeps Metro-OLDM/OLDM in the transport stack. Discovery, login, permissions UI, and source-aware multi-resource save remain future pressures.

### Validation

Unit tests cover Metro-Solid resource method calls, Turtle parse/write behaviour, missing-resource load, failed save, and delete behaviour. A mounted browser test creates a note through the public API, saves Turtle through the Solid resource adapter, remounts, and restores the note from the same fake resource.

### Book consequence

The book can show the first Solid step as a replaceable edge adapter over a stable application port. A broader workspace abstraction should wait until the app combines several resources or needs per-source provenance.

## DP-003: Solid Client Developer Experience

**Status:** Proposed  
**Active slice:** `docs/CURRENT_SLICE.md`  
**Opened:** 2026-07-19

### User-visible need

A reader should connect their WebID, let margin-notes discover a per-page Solid resource, save notes as Turtle, reload the book, and see those same notes restored without manually inspecting network traces or Turtle.

### Attempt with the current stack

The application composes `jsfs-solid`, Metro-Solid, Metro-OIDC, Metro-OAuth2, Metro-OLDM, OLDM, and an application-level `createSolidResourceStore()`.

### Observable problem

Several failures were only visible after real browser/Solid testing:

- Popup OAuth helpers were available in Metro-OAuth2 but not exposed through the Solid-facing client package.
- OAuth middleware retried body-bearing requests after a 401/403, which can disturb a `ReadableStream` and surface a browser-level `Request` construction error.
- OAuth failure can appear as a successful `200` response with body `"false"`, which an application can accidentally treat as empty data.
- Linked-data load/save code accepted incomplete `oa:Annotation` subjects and could write or preserve annotation shells with no body or target.
- Turtle that contained conventional note parts without the linking triples (`oa:hasBody`, `oa:hasTarget`, `oa:hasSelector`) did not load as a note until application code added a recovery heuristic.

### Why this is not merely application policy

The app owns the note model and host UX. It should not need to know how OAuth middleware replays requests, how a login-cancel placeholder is encoded, or which low-level linked-data failure shapes are likely after using the stack. Shared libraries can make these failure modes explicit, typed, and testable before the application mutates user data.

### Candidate owning layers

- Metro-OAuth2 and Metro-OIDC
- Metro-OLDM and OLDM
- Metro-Solid
- JSFS-Solid
- SimplySolid or a future source-aware workspace
- Margin-notes component as a temporary defensive layer

### Smallest experiment

Add focused contract tests in `solid-tools` for OAuth retry safety, popup helper exposure, failed authorization signalling, and linked-data shape validation/repair. Keep the current application guards until the library behaviours are proven and consumed.

### Proposal

See `docs/proposals/0001-solid-client-dx.md`.

### Evidence

Current application tests capture the observed failures and temporary protections:

- `test/browser-mounted.test.js` covers connect, save Turtle, remount, reconnect, and reload.
- `test/solid-resource-store.test.js` covers non-document JSON, failed writes, and recovery of conventional note parts with missing linking triples.
- `test/annotation-model.test.js` drops incomplete annotation shells before app state and save.

### Resolution

Pending library investigation. The application currently contains defensive code so the book demo works, but the desired developer experience is for these failures to be prevented or signalled in the Muze Solid stack.

### Validation

The application should later be able to remove the special OAuth/write guard and most graph-repair heuristics while keeping the same browser tests passing against the shared-library behaviour.

### Book consequence

The book can use this as a concrete example of boundaries becoming visible under pressure: the app can defend user data locally, but excellent libraries make the sharp edges impossible to miss.

## DP-004: Local-First Workspace Resource

**Status:** Validated
**Active slice:** `docs/CURRENT_SLICE.md`
**Opened:** 2026-07-20

### User-visible need

A reader should be able to write notes while offline or before choosing a Solid Pod, reopen the app later, and then sync those local notes to the discovered Solid resource when they connect.

### Attempt with the current stack

The app first loaded the local graph and remote Turtle graph as two application values and merged them in `paragraph-note-stacks.js`.

### Observable problem

The merge function made margin-notes responsible for open-world resource semantics: which graph wins, which resource receives the result, and how local-only work later becomes remote work. That is the same problem SimplySolid is meant to make reusable.

### Why this is not merely application policy

The application owns the note shape and reader workflow, but a local resource and a remote Solid resource are a general replicated-resource problem. Other PWA-style Solid apps will need the same ability to open locally, attach a remote replica later, and sync without rewriting merge logic.

### Candidate owning layers

- SimplySolid
- solid-workspace
- Margin-notes component as consumer

### Smallest experiment

Use a SimplySolid local-first `notes` resource as the default store. On Solid connect, add the discovered Turtle resource as the remote replica and call `sync('notes')`.

### Evidence

- `test/browser-mounted.test.js` covers local create/restore through the SimplySolid path.
- `test/browser-mounted.test.js` covers connecting with existing local notes and existing remote notes, then syncing both into the discovered resource.
- `test/browser-mounted.test.js` covers reconnecting to a remembered Solid resource and restoring the synced note.
- Manual validation on 2026-07-20 confirmed the margin-notes flow works in the programming-for-wizards book and previously stored notes remain available after the migration.

### Resolution

Resolved in library and validated in application. SimplySolid provides local-first resource descriptors, late remote-resource connection, collection handles, and `sync('notes')`; solid-workspace provides the replicated-resource merge/sync behavior. Margin-notes now delegates persistence and sync to that service.

The app keeps a small custom-store fallback so host-provided stores remain compatible, and it keeps the old local IndexedDB store as a migration source for existing notes. The SimplySolid local resource uses a separate `margin-notes-workspace` IndexedDB database so it does not need to upgrade the old store while that database may still be open.

### Validation

`npm test` passes the mounted browser paths for local create/restore/edit/delete, Solid connection reload, and local-to-remote sync. Manual validation in the programming-for-wizards book confirms the app still works with previously stored notes.

### Book consequence

The book can show local-first as the point where a store adapter stops being the right abstraction. A local document and a Solid Turtle file are better explained as replicas of one logical workspace resource.

## DP-005: Full-IRI values across storage boundaries

**Status:** Validated for the mounted local/fake-Solid workflow
**Active slice:** M3.2
**Proposal:** `docs/proposals/0002-full-iri-values.md`

OLDM `341530e` exposed shorthand class filters in consumers. Solid-tools had
nine failing tests; margin-notes had six, including four mounted-browser paths.
The migration also exposed invalid fixture IDs with two fragments and metadata
loss at the app's literal conversion boundary.

Solid-tools `003c62c` updates full-IRI container detection and literal comparison,
and resolves discovery predicates against their source graph. Application
vocabulary/filtering now uses full IRIs, legacy saved type values expand on load,
and unknown class IRIs, linked values, and literal metadata survive save/reload.
Both `a` and `rdf$type` contribute classes when the fixed-resource adapter writes.

Evidence: all 66 solid-tools tests and 53 application tests pass, including
mounted local create/restore/edit/delete, Solid create/restore/edit/delete/remount,
connection reload, and local-to-remote sync. These browser tests use a fake Solid
client with Turtle persistence. They do not validate a real Pod or authentication.

The lesson is to keep vocabulary identity independent of presentation shorthand.
No new SimplySolid API was needed.

## DP-006: Save completion and editable replicas

**Status:** Implemented; validated for the mounted local/fake-Solid path
**Active slice:** M3.2
**Opened:** 2026-10-30
**Proposal:** `docs/proposals/0003-replica-save-contract.md`

Direct tests of the current workspace reproduce edits accumulating stale values,
deleted notes returning on sync, remote-only changes missing from local storage,
and newer saves being overwritten during sync. Persistence probes also reproduce
ignored failed adapter results, premature IndexedDB completion, and loss of
cyclic RDF structures. These belong to persistence and replica ownership in
solid-workspace, with failure propagation through SimplySolid. The application
must consume those contracts rather than implement its own merge or save lock.

## DP-007: Edits need one authoritative resource graph

**Status:** Validated against local package builds; not released

**Active slice:** M3.2

**Recorded:** 2026-10-30

Editing a linked note body and reconnecting must retain the edit and unrelated
resource facts. The workspace context refactor initially exposed a detached
child through the mounted connection test: saved text reverted after reconnect.
The workspace's collection update must preserve named-subject graph ownership;
an application-owned copy/merge would duplicate that responsibility.

[Proposal 0004](proposals/0004-workspace-context.md) records the existing guide's
boundary decision, attempted integration, failing evidence, and implementation.
The note was recorded during the refactor, after the integration failure, rather
than before implementation. All 107 library tests and 42 current app tests pass against
packed local builds. The user explicitly requested removal of compatibility;
D047 records the coordinated native-only API and app changes. App dependencies still point to released packages.

The book should distinguish live source graphs, cross-source context lookup,
and detached persistence snapshots, and show why saving one subject must retain
its resource's other facts.

## Entry template

Copy this section for each new pressure.

```markdown
## DP-NNN: Concise problem name

**Status:** Observed  
**Active slice:** Link to `docs/CURRENT_SLICE.md` or issue  
**Opened:** YYYY-MM-DD

### User-visible need

What must the current slice allow the reader to do?

### Attempt with the current stack

What code or API was tried?

### Observable problem

What became impossible, unsafe, misleading, or unnecessarily duplicated?

### Why this is not merely application policy

Explain why the application or component should not own the behaviour.

### Candidate owning layers

- Application
- Margin-notes component
- SimplySolid
- Another named library
- Convention or documentation only

### Smallest experiment

What is the least work that can distinguish the candidates?

### Proposal

Link to `docs/proposals/NNNN-name.md` when a shared-library change is proposed.

### Evidence

Link to failing tests, fixtures, examples, commits, or issue discussions.

### Resolution

What changed, in which repository, and what remained deliberately unsupported?

### Validation

Which end-to-end application test demonstrates the result?

### Book consequence

What should the future book explain because this pressure existed?
```

## Logging rules

- Record the pressure before implementing a shared-library solution.
- Describe observed behaviour, not a preferred API.
- One pressure may end with no library change.
- Split pressures when they have different owning layers or tests.
- Link design changes to evidence; do not rewrite history into a tidy story.

## DP-008: Native RDF for Cobalt fragments

**Status:** Resolved in application; validated in mounted browser tests
**Active slice:** M3.2
**Recorded:** 2026-10-30

The user requires fragment text and ordered annotations to be readable as RDF,
without adding a Turtle dependency to Cobalt. The existing application stores
`JSON.stringify(fragment)` in `cobalt:fragment`, hiding formatting from RDF tools.
Cobalt already has a plain `Fragment` value and editor `getValue`/`setValue` API;
no shared-library change is required.

An application bridge maps this value to a named fragment node with `rdf:value`
and a `cobalt:annotations` OLDM Collection. Each annotation retains start/end,
tag and Cobalt precedence order. New edits create distinct fragment nodes; the
body's timestamped scalar link chooses one complete text/formatting snapshot.
Old fragments and unknown RDF facts remain in the resource. Pruning them is
separate work. The mapping is a Muze convention, not a Solid or Cobalt dependency.

Validation covers ordered and duplicate annotations, UTF-16 ranges, empty
lists, invalid input, unknown facts, competing edits, and a mounted Cobalt
edit/save/reload through Turtle. See `COBALT_RDF.md` for the contracts and tests.

## DP-003 follow-up — WebID namespaces, 2026-10-30

Real WebID discovery fails on `<http://>` / `<https://>` prefix declarations
before their local names supply the host. This is an OLDM namespace-validation
boundary issue, separate from application middleware duplication. The concrete
attempt and narrow repair are recorded in proposal 0001. Validation will use
sanitized profile Turtle through the installed client stack.

## DP-009: Compact annotations need an explicit edit owner

2026-10-30, M3.2. Implemented and validated in the mounted mock-Solid path:
one canonical text and one annotation timestamp.
The existing per-subject merge requires duplicate body metadata; removing it
leaves body fragment links additive. Reconciliation belongs in Solid Workspace,
with application-declared ownership and SimplySolid forwarding. See
[proposal 0004](proposals/0004-annotation-edit-ownership.md).

## DP-010: Replica merging drops the application's compact prefix

2026-10-30. The app declares a page-specific `note:` prefix to abbreviate its
annotation and snapshot IDs. The existing merge kept only the first graph's
prefix declarations, so connecting to a remote resource discarded the local
prefix. The mounted local-to-Solid sync test reproduced missing `@prefix note:`.
Prefix retention belongs to graph merging in Solid Workspace; the app should
not rewrite serialized Turtle. See proposal 0005.

## DP-011: Compact paragraph targets need a page base across replicas

2026-10-30. The user selects the page URL as Turtle `@base`, retaining the `note:`
prefix. Existing persistence bases follow IndexedDB or Pod addresses, so targets
remain long absolute URLs. Local and remote mounted checks fail when asserting
the page base. Setting a working graph property alone is lost on reload or merge.
The app supplies the page policy; Solid Workspace must carry a generic base
setting separately from source identity. See proposal 0006.

## DP-012: Current fragments without history and a compact resource prefix

2026-10-30. Immutable snapshots add storage history and random IDs the user does
not need. Reusing a fragment works with existing owned scalar policy, but a failing
app sync test with two unformatted notes exposes `rdf:nil` being treated as a
shared owned node. Empty Collections must have no owned members. The app can
then declare the complete fragment's fields under the annotation edit timestamp.
The resource code also belongs in `note:`; applying that preference must preserve
unknown predicates using an older prefix mapping. See proposal 0007.

## DP-013: Transport overrides the application's selected RDF backend

2026-10-30, M3.2. The user selects Turtle only for margin-notes. The initial
experiment passed using test-only N3-named aliases, but production must not
mislabel the selected parser. Metro-OLDM currently forces N3 exports into the
context options. Its existing factory/override boundary should supply defaults
without knowing the adapter name. See [proposal 0008](proposals/0008-app-turtle-backend.md).
