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

## Release preparation — 2026-10-30

Solid Workspace and SimplySolid target 0.2.0 for the native API changes.
Margin notes remains 0.1.0 for its first publication and requires both libraries
at ^0.2.0. The published Cobalt rich-text package is now a declared dependency;
its core dependency resolves through npm. The build no longer uses sibling
Cobalt aliases. The earlier Cobalt publication-pending note is superseded:
both scoped 0.1.0 packages were verified on npm at commit `7ff42ad`.

Before publication, the app lockfile is prepared from packed 0.2.0 release
candidates with registry tarball destinations and their actual integrity hashes.
Validation uses those candidates plus registry Cobalt packages. A registry-only
install of this lockfile requires publishing Solid Workspace and SimplySolid
first; it has not been claimed as completed before publication.

Release-candidate validation: 107 Solid Tools tests and 48 margin-notes tests
pass, with lint/build checks. The app install uses npm Cobalt 0.1.0 and no sibling
aliases. A prepack build prevents publication of an outdated bundled app.

## WebID discovery repair — 2026-10-30

A request to the reported public WebID with `Accept: text/turtle` returned
HTTP 200 and `Content-Type: text/turtle`. The profile declares `<http://>` and
`<https://>` namespaces, then supplies the host in prefixed local names. OLDM
incorrectly applied complete HTTP identifier validation to those namespace
strings. OLDM core now resolves and validates namespaces separately; expanded
identifiers retain the existing validation. Both N3 and the small Turtle adapter
have parse/write regression coverage. The downloaded profile parses and
round-trips with the fix; its personal contents are not stored in repository tests.

The application also installed RDF middleware twice. It now disables the
JSFS-Solid middleware for discovery and storage clients because `solidApi` owns
RDF parsing. Discovery reads source graphs through an application OLDM context
with explicit prefixes, so `pim$preferencesFile` and `mn$rootFolder` work even
when documents choose `space:` and `notes:`. Native graphs retain their original
prefixes and provenance. Browser doubles now use native graphs for these reads.

Validation: all 897 OLDM assertions and 49 application tests pass, including
12 mounted Chromium tests, plus application lint and release builds. Application
checks use packed fixed OLDM core with registry dependencies in an isolated
install; there are no sibling aliases. Real authenticated Pod writes were not
performed. The installed book package has not been replaced.

Prepared patch releases (unpublished): `@muze-nl/oldm-core@0.8.1`,
`@muze-nl/oldm@0.8.1`, `@muze-labs/oldm-turtle@0.4.1`, and
`margin-notes@0.1.1`. Publish core first, then OLDM and the Turtle adapter;
margin-notes requires OLDM ^0.8.1. The Turtle adapter is not used by this app.
The app lockfile has registry destinations and integrity hashes from the exact
release artifacts. After publishing OLDM, run `npm ci` in margin-notes before
packing/publishing it so its prepack build uses the fixed installed dependencies.
After publishing margin-notes, run `npm update margin-notes` in the book and
rebuild it. No release was published by this repair.

## Token response handling — 2026-10-30

Real browser authorization exposed Metro-OIDC reading the grant type after
fetch consumed the outgoing token POST body. The observer now captures it before
dispatch. An application integration test with native request/response bodies
also exposed a response stream being treated as parsed JSON; the observer now
parses a clone of the native response, leaving OAuth2's response body readable.
Token signature, nonce, identity and refresh validation remain in place.

Validation: the Metro workspace suite passed (476 assertions), then all 89 OIDC
assertions passed again with native response coverage added. All 50 application
tests pass, including 12 mounted Chromium tests, plus lint and release builds.
The authenticated preferences test uses a mock issuer and actual installed
middleware; DPoP is disabled only in that Node test because its browser IndexedDB
key store is unavailable. This is not a claim of successful real-Pod login.

Prepared unpublished patches: `@muze-nl/metro-oidc@0.9.3`, followed by
`margin-notes@0.1.2`. The app lockfile includes the new OIDC tarball integrity and
registry destination, verified using an isolated packed install. After publishing
OIDC, run `npm ci` in margin-notes before publishing it. Then update margin-notes
in the book and rebuild. No new JSFS-Solid or OLDM release is required.

## Authorization retry and preferences initialization — 2026-10-30

After the token-processing crash, Connect immediately retried a cached spent
code and received `invalid_grant`. A regression reproduces the same sequence.
Metro-OAuth2 now retires the authorization code before dispatching its exchange,
so a failed/lost/invalid response cannot leave it available for reuse. Errors
remain visible; a subsequent Connect obtains a new code. Existing users with a
cached code from the old implementation can remove only the issuer's
`:authorization_code` localStorage entry and reconnect; note storage is untouched.

Successful authentication then exposed preferences code treating Metro-Solid
results as HTTP Responses. The app now uses its success/throw contract for HEAD,
PUT, PATCH and container creation. HEAD 404 selects file creation; other failures
propagate. Existing preference documents are updated with INSERT DATA. Native
transport tests cover empty success responses, existing/missing preferences,
and denied HEAD/write operations without subsequent writes. No shared Solid API
change or compatibility layer was added.

Prepared releases: `@muze-nl/metro-oauth2@0.9.3`, then
`@muze-nl/metro-oidc@0.9.4` (updated minimum OAuth2 dependency and browser bundles),
then `margin-notes@0.1.3`. Run npm ci in margin-notes after publishing the libraries
so prepack includes their fixes. Tests use packed artifacts and registry
third-party dependencies in an isolated install. The app lockfile contains their
verified integrity hashes and registry URLs, with no local links. The book still
uses published margin-notes 0.1.2 until these patches are published and installed.

Validation: all 168 OAuth2 assertions and 89 OIDC assertions pass, plus all 57
application tests (including 12 mounted Chromium tests), lint and release builds.
The retry integration uses persisted browser-like state and a mock issuer; no
real-Pod write or browser session was modified during these checks.

## Inline formatting and popup cleanup — 2026-10-30

The margin template previously displayed only the fragment's plain text even
though editing and Turtle storage preserved its annotations. It now binds the
fragment through a SimplyFlow transformer using Cobalt's existing renderer.
Formatting stays a derived view; no HTML is stored in the note graph. The app
only adapts Cobalt's output to SimplyFlow and renders empty bindings as empty
content during mounting and graph replacement. Attribute validation is deferred
as a TODO in cobalt-note; the app does not filter Cobalt's rendered markup.

Connect still reserves its OAuth popup from the initiating click. The connection
operation closes that window after success or failure, including when an existing
session makes login unnecessary. It releases the reference so a later authorization
attempt does not reuse the closed window.

Validation: all 57 application tests and lint pass. Mounted Chromium coverage
checks visible bold and italic before and after Turtle reload, removing formatting,
and popup cleanup with and without login and after failure. These application fixes are not yet published.

## Compact annotation edits and numeric literal equality — 2026-10-30

Text now lives only in the Cobalt fragment's `rdf:value`. Only the annotation
carries `dcterms:modified`. The app declares `oa:hasBody` ownership and the scalar
`cobalt:fragment` link. Solid Workspace selects one revision for the entire edit
group, including deterministic timestamp ties, and preserves unknown facts.
SimplySolid forwards this resource policy. Ownership is not stored in the graph.
No migration, pruning, or Cobalt package change is included.

OLDM now treats absent and empty language metadata consistently when comparing
literals. Numeric fields no longer duplicate when a created fragment merges
with its Turtle-parsed copy. Workspace literal keys also equate numeric and
lexical representations of an explicitly typed literal.

Validation: 904 OLDM assertions, 113 Solid Tools tests, and 58 application tests
including 12 mounted Chromium tests; Solid Tools and application lint pass.
Application tests use isolated packed fixes, not sibling links or a modified book.
No real-Pod data was read or rewritten for these checks.

Prepared release order: oldm-core 0.8.2, oldm-n3 0.8.1, oldm 0.8.2,
solid-workspace 0.2.1, simplysolid 0.2.1, margin-notes 0.1.5. Published margin-notes 0.1.4 remains separate.
Publish libraries first, run npm ci in margin-notes, then publish its new bundle.

## Page identifiers and concise Turtle — 2026-10-30

New annotations use the page URL plus `#margin-note-<resource-code>-<counter>`.
The random code is eight URL-safe characters shared by the resource. Reloads
recover it and the counter from stored IDs, including deleted notes; existing
IDs are never rewritten. Cobalt snapshot identifiers were subsequently changed to page-based IDs (see below). This does
not solve multi-device or cross-tab offline counter allocation.

OLDM's N3 and small Turtle adapters now track the prefixes actually emitted,
including patch output, and omit all others without changing editing contexts.
The pending release also needs oldm-n3 0.8.1 (used by oldm 0.8.2); oldm-turtle
0.4.2 has the equivalent fix but is not a margin-notes dependency.

A local book build uses packed unpublished fixes for testing. Book dependency
manifests continue to reference registry releases; there are no sibling links.

Validation of the combined local build: 920 OLDM assertions and all 60 app tests
(including 13 mounted Chromium tests) pass, with application lint. The book
build/check passes for 25 reading pages and EPUB. A disposable browser against
the running book confirms shared-code IDs, bold rendering, single text values,
no body timestamp, singular numeric fields and only rdf/dcterms/oa/cobalt
prefix declarations. Served bundle SHA-256:
`84367d5b7447b846d51a2ca9237279124fb1615f3eda60b578151f2c849cd7bb`.
The local checkout and book install contain packed unpublished dependencies;
registry manifest/lockfile references remain ready for publication. No existing
browser note database or Pod was changed by this smoke test.

## Silent reconnect on page reload — 2026-10-30

Automatic reconnect now calls the connection action with `interactive: false`.
It neither reserves a blank popup nor starts popup authorization. Existing tokens
can reconnect normally; if fresh authorization is needed, the connection UI says
“Sign-in required. Click Connect to continue.” Explicit Connect retains the
click-time popup reservation and cleanup after success or failure. UI event
handlers consume the rejected action promise after the action displays its error;
programmatic callers still receive rejections.

Validation: all 61 application tests and lint pass, including a mounted test for
silent reconnect, required sign-in without a popup, and a subsequent successful
Connect click with popup cleanup. The unpublished 0.1.5 local book build includes
this fix; no browser storage or Pod data was cleared.

## Compact page-based fragments and direct targets — 2026-10-30

New Cobalt snapshots derive their IDs from the annotation plus a fresh short
random suffix; ordered formatting members derive their IDs from the snapshot.
The RDF bridge takes an explicit ID and guards against snapshot overwrites.
A page-specific `note:` prefix abbreviates these IDs. Solid Workspace now retains
prefixes from later merge inputs too, so synchronization keeps the abbreviation.
Conflicting prefix labels retain the first source's mapping; full IRIs are unchanged.

Targets now directly link to the paragraph URL. No SpecificResource or
FragmentSelector nodes are generated. Resolution checks the current page and
decodes the fragment. Existing stored IDs and structured targets are not migrated;
old snapshots remain in the graph. The current reader uses direct targets only.

Validation: all 63 app tests and lint pass; Solid Tools passes 114 tests and lint.
The local book build/check passes. A disposable browser against the running book
confirms two notes share a resource code, targets are direct paragraph IRIs,
new snapshot/member IDs are page-based, formatting survives save/reload, and
only cobalt/dcterms/note/oa/rdf prefixes are emitted. No UUID URNs or structured
target nodes occur in the newly saved graph. Book manifests retain their registry
references; installs use packed files, not sibling symlinks. Bundle SHA-256:
`b782c60d706edf0d27369c1c6a33abb9c47bce4969605346b783cab9b688c5ba`.
No user browser storage or Pod was changed by validation.

## Page URL as Turtle base — 2026-10-30

The notes resource now sets `baseURI` to the current page URL. SimplySolid forwards
it; Solid Workspace keeps it across graph copies, local persistence, replica merges
and reconnects. Storage URLs and incoming RDF identities are unchanged. Saved
Turtle uses the page `@base`, `note:` identifiers and `<#paragraph-id>` targets.

Validation: all 115 Solid Tools tests and 63 application tests pass, with lint.
The rebuilt local book passes its checks and a disposable live-book browser test
confirms the page base, relative targets, compact IDs and formatting after reload.
Book manifest/lockfile references are unchanged; packed artifacts are installed
without sibling links. Current served bundle SHA-256:
`8d8a3cbabb75553eb3bb869db6cb84e338cab24c193bcc22bb1d6ae95b714366`.
No publication, commit, user-storage clearing or Pod write was performed.

## No placeholder notes during startup — 2026-10-30

Anchor list data is now initialized before widgets are attached. Previously the
binding saw an undefined list, rendered one empty item, then removed it when the
real array arrived. The new mounted regression observes inserted DOM nodes across
initial mount and remount: empty paragraphs never receive note articles, while a
saved note still returns on its own paragraph. Add buttons remain available.

All 64 application tests and lint pass. The local book was rebuilt and checked;
a disposable browser observed zero initial note insertions, then verified note
creation, reload and formatting. A smoke assertion was also corrected to allow
Turtle's escaped leading hyphen in random identifier codes; the affected browser
tests pass. Current served bundle SHA-256:
`d35e8babeb1bce9fd71280bbc546fb983849ffb4a76ea5a0348d4718f09d2964`.

## Current fragments, compact resource prefix, and standard OA HTML — 2026-10-30

D053–D054 supersede the snapshot/body model described earlier. New notes reuse one
Cobalt fragment and indexed formatting nodes, without retaining edit history.
The resource's single random code is in `note:`, yielding `note:1-fragment-0`.
Removed formatting fields are cleared; unknown facts remain. Workspace now treats
rdf:nil as an empty owned Collection and applies resource prefix preferences to
copies, preserving the meaning of existing predicates.

The annotation directly links to the editable fragment and to its generated HTML
TextualBody. The fragment links outward to that same HTML node with
`dcterms:hasFormat`. Cobalt's renderer generates its string `rdf:value`, with
`dcterms:format "text/html"`. Ownership runs through the fragment so text, HTML and
formatting follow one annotation timestamp. Cobalt itself has no RDF dependency.
Previous body-to-fragment test data and old snapshots are not migrated or swept.

Validation: Solid Tools passed 118 tests and lint. The full app suite passed 65
tests; a subsequent model-suite run also passed the new OA-only reader regression
(66 unique app tests covered). App lint and the book build/check pass. A disposable
browser on the actual book confirms compact IDs, zero placeholder notes on mount,
HTML matching the formatted text, and editing/reopening without extra fragments
or stale HTML. The installed package and served bundle match SHA-256:
`b1025c231b7cd84721a3c408c0630550ab310cb41a40fc7ea47fc0e99932145e`.
Book manifests retain registry references; the local preview uses packed artifacts
without sibling links. No commits, publication, user-storage clearing or Pod writes
were performed by this validation.

## Release preparation — 2026-10-30

The final complete application run passes all 66 tests and lint. Library commits:
OLDM `3b54af0` and Solid Tools `d38e44b`. Prepared publications are oldm-core 0.8.2,
oldm-n3 0.8.1, oldm 0.8.2, solid-workspace 0.2.1, simplysolid 0.2.1 and margin-notes
0.1.5; oldm-turtle 0.4.2 has the equivalent optional writer fix. Registry checks
show none of these versions published yet. Packed contents match their checkouts.
The book manifest and lockfile now select margin-notes 0.1.5 and the tested library
versions, with registry URLs; npm's offline dry-run lockfile check passes.
