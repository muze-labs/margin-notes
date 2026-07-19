# Open Questions

These questions should be answered through small experiments or working slices, not only discussion.

## Product and targeting

- How much annotation targeting can be reliable without cooperation from the host page?
- Should an unresolved note remain visible at page level, and how should the user reattach it?
- How should notes behave when the same content appears on canonical and paginated URLs?
- Is a document version or content hash useful enough to justify its complexity?

## Data model

- Is Web Annotation sufficient for Cobalt bodies and application state without Muze-specific wrapper terms?
- Should structured and plain-text bodies coexist for interoperability?
- How are drafts, retractions, and revisions represented without inventing one overloaded status field?
- What is the identity relationship when a local note is copied to a Pod?

## Storage and workspace

- Can browser storage participate in the same source-aware workspace API as Solid resources without distorting either model?
- Should local notes be one graph, one graph per document, or one resource-like record per note?
- How should a newly created note choose a target resource when several writable sources are active?
- What should remain pending after one resource in a multi-resource save fails?
- How are deletes represented safely in a shared multi-subject resource?

## Discovery

- Which mechanism should have priority: explicit configuration, page metadata, remembered preference, profile link, or type index?
- How can an application explain where a discovered storage target came from?
- Should the component create storage automatically or always ask first?

## Permissions and sharing

- Which common sharing operations can be expressed without hiding meaningful WAC and ACP differences?
- Does submission copy a note, link to it, grant access to it, or support several explicit modes?
- How can a user revoke a submitted or published note when another party controls the destination?

## Components and stack boundaries

- Which parts belong in the reusable component and which remain host-application policy?
- Does SimplyFlow need new primitives for async effects, partial source failure, or editor state?
- Should the Cobalt editor modal become a SimplyFlow component or small SimplyFlow app instead of an imperative promise helper with local DOM actions?
- Can OLDM Shape match the required Web Annotation structures without turning into a mapper?
- Where should target-resolution algorithms live: this package, a generic annotation library, or the host integration layer?
- Does Assert need additions to express linked-data invariants cleanly?

## Interoperability

- What is the smallest useful handoff to a second annotation application?
- Which proposed application conventions solve an observed need in this project?
- Can a second application edit the same notes without importing this component's code?

## Residential programming

- Which component boundary is most useful to modify: editor, renderer, target resolver, storage policy, or publication action?
- How can a broken overlay be disabled before it prevents the recovery UI from loading?
- How should remote mods declare compatibility with component versions?


## Demand-driven SimplySolid workflow

- Which first Solid-backed slice will produce enough evidence to choose between direct jsfs-solid use and a SimplySolid workspace?
- Which designed workspace capability turns out to be unnecessary for the margin-notes application?
- What is the smallest real-server setup that can validate resource provenance, save routing, and partial failure without becoming project infrastructure of its own?
- How should exact `solid-tools` commits or local package versions be recorded before public releases exist?
