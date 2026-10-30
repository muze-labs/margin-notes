# Decision Log

Record decisions here while the project is small. Larger decisions may later move into individual ADR files.

Statuses:

- **Accepted** — current direction; implementation may still force revision
- **Proposed** — plausible direction requiring a test
- **Deferred** — intentionally postponed
- **Rejected** — considered and not chosen

| ID | Status | Decision | Reason |
|---|---|---|---|
| D001 | Accepted | Build the reference application before writing the book. | The application should expose real constraints and prevent the book from teaching speculative solutions. |
| D002 | Accepted | Start with browser-local storage and no login. | It produces a complete vertical slice and keeps Solid integration from hiding basic product problems. |
| D003 | Accepted | Use one linked-data model for local and Solid-backed notes. | Storage mode should not create two application models or a later migration rewrite. |
| D004 | Accepted | Keep the component reusable outside *Programming for Wizards*. | Reuse is one of the claims the project is meant to test. |
| D005 | Accepted | Allow the host page to configure or advertise a submission inbox. | Other site authors must not be forced to use the book author's inbox. |
| D006 | Accepted | Allow site-provided public note sources, default or optional. | A site author may curate notes without owning the reader's private notes. |
| D007 | Accepted | Treat submission and publication as separate operations. | An inbox is not a public collection, and curation must not silently publish user data. |
| D008 | Accepted | Prefer stable host-provided fragment identifiers, augmented by quote/context selectors. | No single targeting mechanism survives every document change. |
| D009 | Accepted | Preserve unknown predicates and extra types. | A Solid application is one partial view over shared open-world data. |
| D010 | Accepted | Keep provenance and write capability with each loaded subject. | A combined UI must not imply that all notes came from or can be saved to one place. |
| D011 | Accepted | Introduce contracts early and keep them in later examples. | Boundary assumptions should remain executable rather than becoming prose only. |
| D012 | Accepted | Load residential overlays only after explicit application opt-in. | User-modifiable code is powerful and must not be discovered or executed silently. |
| D013 | Proposed | Use the W3C Web Annotation vocabulary as the base data model. | It already describes annotations, bodies, targets, and selectors, but must be tested against Cobalt and Solid save behaviour. |
| D014 | Proposed | Keep resource loading outside presentation components. | Reusable components should depend on data and capabilities rather than storage locations. |
| D015 | Proposed | Use a source-aware SimplySolid workspace as the central Solid data boundary. | It matches the need to combine multiple resources while preserving provenance and save targets. |
| D016 | Deferred | Define launcher, intent, and common-bus conventions. | These should be driven by a working interoperability need, not added to complete a conceptual stack. |
| D017 | Accepted | License the project as MIT with copyright muze.nl. | The project is intended to be reusable, and the owner has selected the public license explicitly. |
| D018 | Accepted | Use the margin-notes application as a demand-driven test of SimplySolid. | Shared-library work should follow concrete application pressure rather than the SimplySolid design roadmap. |
| D019 | Accepted | Track SimplySolid capabilities as designed, required, implemented, or validated. | A design idea, tested library API, and successful application path are different kinds of evidence. |
| D020 | Accepted | Require a design-pressure entry and small proposal before adding a shared-library capability. | The record prevents AI-assisted work from turning speculative gaps into broad abstractions. |
| D021 | Accepted | Keep SimplySolid implementation in `solid-tools`, with separate library and application commits. | The reference application must validate the package boundary rather than hide framework code locally. |
| D022 | Accepted | Use `margin-notes` as the package name. | The name matches the component's reusable role and leaves Solid support as a capability rather than the package identity. |
| D023 | Accepted | Use Node.js' native test runner as the current `npm test` entry point. | The current slice has simple contract tests and does not need Jest yet; browser automation can be added when end-to-end coverage requires it. |
| D024 | Accepted | Leave the exact Web Annotation shape open until implementation needs it. | The project should not freeze a normative annotation shape before the local slice proves the required facts. |
| D025 | Superseded by D048 | Store Cobalt bodies in the minimal JSON format for browser-local storage. | The local store should preserve the editor body without inventing a richer body model before interoperability requires it. |
| D026 | Accepted | Put note-creation affordances on host anchors and reveal them only on hover or keyboard focus. | Creating a note is target-driven; the margin panel should stay quiet until there are notes to show. |
| D027 | Accepted | Show notes beside their target as collapsed single-line cards that expand in place. | Reader notes should stay spatially tied to the paragraph and avoid turning the margin into a separate feed. |
| D028 | Accepted | Fit collapsed note stacks to the paragraph height and show an overflow toggle only when notes are hidden. | Multiple notes should not visually run into the next paragraph until the reader deliberately opens that stack. |
| D029 | Accepted | Let arrow keys move note focus within a paragraph stack and let Escape collapse and blur the stack. | Keyboard readers should be able to traverse note context without being forced into pointer-only expansion controls. |
| D030 | Accepted | Render paragraph note chrome with SimplyFlow templates and route note interactions through SimplyFlow commands and shortcuts. | The app is an example of the stack; imperative DOM remains only for host-anchor attachment, layout measurement, and focus placement. |
| D031 | Accepted | Expose `mount(config)` as the primary API and let the mounted SimplyFlow app own note behavior through async actions. | The example should demonstrate the app framework directly; the old component class can remain as a compatibility adapter rather than the main architecture. |
| D032 | Accepted | Package paragraph note stacks as a SimplyFlow feature component without component-owned state. | Feature components can bundle templates, styles, commands, shortcuts, and actions; app-owned state is initialized in `data.marginNotes` by an explicit app start call. |
| D033 | Accepted | Keep feature behavior live-edit friendly by routing helper code and dependencies through `app.api`. | Overridden running functions should have the same visible context as the original, so note actions use `this.api.notes` rather than private module helpers or the component registry. |
| D034 | Accepted | Keep feature HTML and CSS in separate files imported as text. | The app should demonstrate SimplyFlow component composition without burying templates and styles inside JavaScript behavior modules. |
| D035 | Accepted | Use Muze design principles as standing constraints for the app and associated libraries. | The repository is a teaching example for the Muze stack, so trade-offs should explicitly prefer simplicity, composability, replaceability, browser-native standards, stable APIs, small software, and view-source-friendly code. Package namespaces must also reflect maturity: `@muze-labs` for experiments and `@muze-nl` for production-ready packages. |
| D036 | Accepted | Use OLDMed `prefix$predicate` property names for local annotation subjects before requiring a direct OLDM-backed resource model. | This keeps the current slice small while avoiding a naming migration when OLDM later parses native linked-data resources. The selected M1.1 terms come from RDF, RDFS, Dublin Core Terms, Web Annotation, Schema.org, and a clearly labelled Muze Cobalt convention. |
| D037 | Accepted | Use *Programming for Wizards* as a standing product and architecture touchstone. | The margin-notes component is the book's concrete example of private notes, stable passage addresses, linked meanings, user-owned storage, deliberate sharing, and replaceable applications. Future work should warn before moving away from those reasons. |
| D038 | Accepted | Use small generic store names at the app boundary and keep IndexedDB as an implementation detail. | The local store should not advertise its backing mechanism or care about the shape of stored data. This keeps the current slice readable while leaving room for a future JSFS adapter if file-shaped local storage becomes useful. |
| D039 | Accepted | Use a curated `the-ds` subset for margin-notes styling instead of importing the whole design system. | Margin notes is embedded into host pages and should not reset or restyle the book around it. The app keeps selected DS tokens and button/dialog primitives locally, with `:host`-ready token defaults for future Shadow DOM use. |
| D040 | Accepted | Expose a generic margin-notes theme setting instead of reading host page theme state. | Hosts can mount with `theme: "system" | "light" | "dark"` and update it through `setTheme()`. Book-specific adapters may translate their own reader settings into that API, while the component remains reusable outside *Programming for Wizards*. |
| D041 | Accepted | Add a fixed-resource Solid store adapter before introducing a SimplySolid workspace. | The first Solid-backed slice only needs one configured resource through the Muze Solid client stack: Metro, Metro-OLDM, and Metro-Solid. Keeping this as a store adapter preserves the existing component boundary and avoids making source-aware workspace concepts appear before the application needs them. |
| D042 | Accepted | Store the fixed Solid resource as Turtle instead of JSON. | Switching to Metro's JSON API would improve a temporary format. The cleaner teaching step is to keep the app-facing graph document stable while the Solid adapter uses OLDM and Metro-Solid to read and write actual linked data. |
| D043 | Accepted | Use popup OAuth for Solid writes that need authorization. | Full-page redirects discard the running book and margin-notes state. `jsfs-solid` now re-exports Metro-OAuth2 popup helpers so Solid applications can configure the Metro-OIDC stack without depending on Metro-OAuth2 directly. Metro-OIDC itself does not currently expose those helpers, which remains an upstream API gap to resolve. The app's write-only forced authorization guard is temporary protection against Metro retrying disturbed request bodies; the retry safety belongs in Metro-OAuth2 or Metro-OIDC. |
| D044 | Accepted | Use a SimplySolid local-first resource as the default notes storage boundary. | PWA-style offline use means local notes and a later discovered Solid file are replicas of one logical resource, not two app-owned documents to merge. Margin-notes now delegates resource persistence and `sync('notes')` to SimplySolid/solid-workspace, while the old store contract remains available for custom host stores and migration. |
| D045 | Accepted | Keep class and datatype values as full IRIs while retaining prefixed property names. | OLDM `341530e` exposed shorthand comparisons that hid loaded notes and duplicated literal values during sync. Consumers now compare exact IRIs; the app expands legacy saved class values at its load boundary without changing the original input. |

## Decision template

When adding a decision, capture:

1. the concrete problem;
2. the naive or previous solution;
3. evidence that it failed or became insufficient;
4. the selected solution;
5. which layer owns the solution;
6. consequences and unresolved risks;
7. likely book chapter or lesson.

## D046 — Accepted: persistence failure and replica ownership

2026-10-30. Proposal 0003 reproduces stale scalar accumulation, resurrected
deletes, lost concurrent saves, and premature save completion. Solid Workspace
owns their repair; SimplySolid preserves the resulting failures and pending
states. Margin notes supplies editable predicate IRIs and body timestamps, uses
the default Turtle transport, and reports local durability separately from
remote sync. The app announces connection only after installing loaded notes.

Tombstones and timestamped scalar replacement follow the existing minimal sync
draft. Unrelated facts remain additive. Cross-tab ordering, ETag-guarded writes,
and real-Pod authentication are still separate work.

## D047 — Accepted: remove compatibility while updating app and libraries together

2026-10-30. The user confirmed margin notes is the only consumer and requested
removal of backwards compatibility. This supersedes the compatibility portions
of D031 and D045. Remove the graph-document model, legacy class/flat-note
migrations, old IndexedDB importer, class/create host facade, and storageKey alias.
Default and custom stores share one native workspace path and exchange Turtle.
The app owns explicit Cobalt JSON-literal encoding; generic libraries reject
unidentified object values instead of silently encoding them.

Reactive UI values are views. Edits resolve the authoritative workspace node by
id; refresh views after sync replaces source graphs. Unknown resource facts
remain in their graph even when they do not appear in the annotation view.
No package has been published by this change.

## D048 — Accepted: native RDF Cobalt fragments at the application boundary

2026-10-30. The user requests native Turtle fragments and text, with ordered
annotations represented by a Collection and no Turtle dependency in Cobalt.
This supersedes D025 and the JSON-literal portion of D047. The application bridge
maps Cobalt's existing plain Fragment value API to native OLDM fragment and
annotation nodes. No Cobalt, SimplySolid or workspace API change is required.

Each edit creates a fresh fragment snapshot. The body's timestamped scalar link
selects the whole text/formatting value during sync. Unknown facts and prior
snapshots remain in the graph; pruning and revision UI are deferred. The mapping
is documented as an application convention in [Cobalt RDF](COBALT_RDF.md).

## D049 — Accepted: one text value and one annotation edit timestamp

2026-10-30. Supersedes the duplicated text and body-timestamp portions of D048.
Text lives only in the immutable Cobalt fragment. The annotation is the edit
owner and carries the sole modification timestamp. Its body retains its identity,
fragment link, type and format. The application declares `oa:hasBody` ownership
and the editable `cobalt:fragment` predicate to SimplySolid; Solid Workspace
selects one revision for that ownership group. No ownership triples are stored.
Unknown facts and old fragment snapshots remain. This does not migrate existing
stored graphs or introduce pruning. See proposal 0004 and DP-009.

## D050 — Accepted: page-based annotation IDs with a resource code

2026-10-30. The user selects the page URL plus a short random code and counter,
with one code shared by all notes in a resource. The app recovers allocation
state from existing IDs (including tombstones) and reserves counters in memory
while mounted. It adds no RDF metadata. Existing IDs remain unchanged. This
assumes a single allocating writer; concurrent offline allocation requires
coordination. URL canonicalization and note-link navigation are not implemented.

## D051 — Accepted: compact IDs and direct paragraph targets

2026-10-30. The user requests page-based fragment IDs, a margin-notes prefix, and
paragraph URLs instead of separate target/selector structures. The annotation
model allocates snapshot IDs under their parent annotation with a short random
revision suffix; the RDF bridge takes the ID explicitly. This preserves immutable
revision identity. One `note:` prefix abbreviates the page's annotation namespace.
`oa:hasTarget` now points directly to the page plus its encoded paragraph ID.
The reader checks page identity and decodes that fragment. No legacy target
fallback, stored-ID rewrite, or snapshot pruning is introduced.

## D052 — Accepted: page URL as the Turtle base

2026-10-30. The user approves using the page URL as `@base`, allowing direct
targets to serialize as `<#paragraph-id>`. Keep the `note:` prefix. The app supplies
`baseURI` through SimplySolid to the workspace resource. Storage URLs and RDF
identities remain unchanged, including facts loaded from other base URLs.

## D053 — Accepted: current fragments and one code in the resource prefix

2026-10-30. The user excludes revision history and collaborative editing. This
supersedes immutable snapshots in D048–D051. New notes have one stable fragment;
formatting IDs are the fragment ID plus an index. The resource's only random code
moves into `note:`, leaving `note:1-fragment-0` for the first formatting member.
Edits replace mapped text/formatting facts. Unknown facts remain, including those
on removed members, but obsolete managed fields are cleared. Existing snapshot
history is not automatically swept or migrated.

The app's ownership and scalar configuration makes the complete current value
follow the annotation timestamp during local/remote sync. This uses existing
workspace ownership, with an empty-Collection correction. Resource prefix
preferences apply to save and merge through graph copies, preserving full IRIs.

## D054 — Accepted: standard OA HTML body owned by the Cobalt fragment

2026-10-30. The user prioritizes Web Annotation interoperability and selects an
annotation with `oa:hasBody` pointing to an HTML `oa:TextualBody`, plus a direct
`cobalt:fragment` link for editing. The fragment owns plain text and annotations
and links outward to the HTML body using `dcterms:hasFormat`. The HTML body has
one string `rdf:value` and `dcterms:format "text/html"`. Cobalt's existing renderer
generates the HTML on every save. No custom HTML predicate is introduced.

This supersedes the body-to-fragment direction and single-text-only storage in
D048–D053. Raw text and derived HTML deliberately coexist. Ownership follows
annotation → fragment → HTML/members; the OA body link is a reference. Scalar
policy selects all managed values under the annotation timestamp. Identities
are stable, unknown facts survive, no revision history grows, and old test data
is not automatically migrated. No changes to Cobalt or new library API are needed.
