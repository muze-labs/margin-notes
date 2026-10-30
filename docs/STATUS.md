# Project Status

## Current phase

Milestone 0 is complete enough to support implementation. The active work item is slice M3.2 in `CURRENT_SLICE.md`: local-first notes that can later sync to a discovered Solid resource.

## Completed

- project rationale;
- initial product design;
- proposed architecture;
- initial linked-data model;
- vertical implementation plan;
- decision and open-question logs;
- AI-assisted workflow guidance;
- demand-driven SimplySolid workflow and stopping rules;
- design-pressure and shared-library proposal records;
- SimplySolid feature-state matrix;
- one explicit active implementation slice;
- privacy and test requirements;
- MIT licence selected;
- package name selected as `margin-notes`;
- host integration API exposes `mount(config)` as the primary app entry point;
- SimplyFlow app composition with the paragraph-note-stacks feature component;
- Cobalt editor modal integration for creating and editing note bodies;
- local browser persistence using OLDMed annotation subjects through an IndexedDB-backed local store;
- executable host contract validation used by the real component;
- headless browser coverage for the mounted public API create, restore, edit, and delete path;
- mounted keyboard coverage for focus, create, note traversal, action reachability, and Escape collapse;
- mounted edit coverage preserves subject identity and unknown predicates;
- quiet paragraph-side creation affordances and collapsed note stacks;
- fixed-resource Solid store adapter behind the existing store boundary;
- Turtle serialization/parsing for the fixed-resource Solid store through OLDM;
- mounted browser coverage that creates and restores a note through the Turtle-backed Solid resource adapter with a fake Solid API client;
- default local-first notes storage through SimplySolid and solid-workspace;
- mounted browser coverage that creates/restores local notes through SimplySolid, connects to a discovered Solid notes resource, merges existing local and remote notes, and syncs the result;
- manual validation in the programming-for-wizards book that margin notes work through the new path and previously stored notes are still available.

## Remaining M3.2 work

Slice M3.2: local-first notes with a Solid replica:

1. record the exact manual smoke-test environment and steps if this validation should become repeatable evidence;
2. validate the existing sync-pending message and recovery flow against a disposable real Pod;
3. decide whether the example page should expose the Solid connection path for manual testing.

## Known unresolved choices

- exact Web Annotation shape;
- local identifier namespace;
- browser tooling;
- exact styling and placement for narrow-screen note creation controls;
- conflict and retry UI beyond the current local-saved/Solid-sync-pending message.


## SimplySolid status

SimplySolid is now required by the default storage path. Features used by the mounted local-first and Solid-connect browser flows are marked in `SIMPLYSOLID_FEATURES.md`; broader workspace capabilities remain **Designed** until an active slice produces evidence for them.

## Full-IRI migration validation — 2026-09-23

Validated against OLDM `341530e` and solid-tools `003c62c` using the local package
links. All 66 solid-tools tests and all 53 margin-notes tests pass; both repositories
pass lint, and the browser bundle builds. The mounted Solid resource test now
creates, restores, edits, deletes, and remounts against saved Turtle. Other mounted
tests exercise IndexedDB persistence and local-to-remote sync/reconnect.

The migration preserves unknown classes, named-node links, and typed/language
literal metadata. Legacy shorthand class values remain readable. Browser Solid
responses are fake-client evidence; a disposable real-Pod smoke test remains
outstanding for the current slice.

## Replica persistence repair — 2026-10-30

Implemented in Solid Tools: transaction-level IndexedDB completion, RDF-preserving
snapshots, native Turtle transport, timestamped scalar replacement, persisted
tombstones, ordered resource operations with revision guards, and truthful save
failure propagation. SimplyFlow now respects fixed-property proxy invariants;
this was required when native OLDM subjects reached the mounted app.

The connected browser scenario validates create/edit/delete/reconnect and a
failed remote save with a durable local note. It uses actual IndexedDB and Turtle
with a fake Solid client. A separate library test composes the real Metro and
OLDM middleware. Existing local, custom-store, editor, keyboard and theme cases
remain part of the suite. No real-Pod or multi-device safety claim is made.

The library repairs are released in `@muze-labs/simplysolid@0.1.0`,
`@muze-labs/solid-workspace@0.1.0`, and `@muze-labs/simplyflow@0.10.4`.
The application integration remains pending review and commit. See proposal 0003.


## Published dependency validation — 2026-10-30

The application now installs Solid Tools, SimplyFlow, and OLDM from npm rather
than sibling checkout links. Tested versions are JSFS-Solid 0.1.1, Metro-Solid
0.1.0, SimplySolid 0.1.0, Solid Workspace 0.1.0, SimplyFlow 0.10.4, and OLDM/Core/N3
0.8.0. Build, lint, and all 57 tests pass, including 11 mounted browser tests.
The Turtle regression uses Solid Workspace's public local-resource API.

Cobalt still builds from the sibling checkout at `7ff42ad`: the requested
`@muze-labs/cobalt-rich-text-note` and `@muze-labs/cobalt-note-core` releases are
pending and currently return npm 404s. Once available, declare the editor package
as a dependency, remove both build aliases, and repeat the mounted tests before
publishing margin notes. No other missing library release was found in the
current dependency chain. Real-Pod authentication/permissions, cross-tab writes,
and conditional remote writes remain unvalidated.

## Native workspace API — 2026-10-30

The user requested removal of backwards compatibility because margin notes is
the only consumer. Solid Workspace now exposes native graphs; adapters exchange
Turtle. The app has no graph-document conversion, flat-note/type migration,
legacy IndexedDB importer, or class/create host facade. Custom host stores use
the same workspace resource as default IndexedDB storage. The native-node
`save(id)` facade preserves SimplySolid failure/status handling.

Validation: 107 Solid Tools tests and 42 app tests pass, including all 11 mounted
browser tests, plus lint/build checks. Migration tests were removed with their
APIs. Browser checks cover local and Solid create/edit/delete/reload, disconnected
local durability, and unrelated graph facts. These are fake-Solid integration
checks, not a real-Pod authentication claim.

Tests use packed local workspace/SimplySolid builds. Published dependency ranges
and versions have not yet been advanced; the breaking library and app changes
need a coordinated release. Solid Workspace is committed as `6a1d682` and SimplySolid as `59b23e0` in
solid-tools. This application commit integrates those changes and the native
Cobalt RDF bridge. No new release has been published for the native workspace API.

## Native Cobalt fragments — 2026-10-30

The application stores fragment text and ordered formatting as RDF rather than
JSON literals. Its bridge uses the existing Cobalt editor value API; no Cobalt
package or dependency changed. Validation uses packed local workspace/SimplySolid
builds from the committed native API, plus the existing Cobalt checkout.

The mounted browser test saves actual Cobalt editor values through a Turtle
store, remounts, checks formatting in the editor, removes formatting and reloads.
Model tests verify competing edits and unknown fragment/annotation facts.
No real-Pod or cross-tab concurrency claim is added. See `COBALT_RDF.md`.

Validation: build, lint and all 48 application tests pass, including 12 mounted
Chromium tests. App code lives in this repository; the isolated test install uses
local packed libraries because the native workspace API is not yet released.
