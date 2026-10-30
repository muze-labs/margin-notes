# One edit timestamp for an annotation and its body

Active slice: M3.2. Design pressure: DP-009. Opened: 2026-10-30.

The user requests one text value and one modification timestamp per annotation.
The current model repeats text three times and timestamps both annotation and
body because workspace reconciliation selects scalars per independently dated
subject. Removing the body timestamp with the current API makes competing
`cobalt:fragment` links accumulate. Application-owned merging would cross the
existing persistence boundary.

Keep text only in the immutable Cobalt fragment's `rdf:value`. Keep the body's
identity and fragment link, and timestamp only the annotation. Resource policy
adds `ownedPredicates`, full predicate IRIs that identify linked named subjects
belonging to the same edit. Margin-notes supplies `oa:hasBody`; its only editable
scalar is `cobalt:fragment`. SimplySolid forwards this policy to Solid Workspace.
No annotation vocabulary enters either library and no ownership triples are
stored. Declared scalar values across an ownership group use one winning root
revision, including deterministic whole-group tie breaking. Unknown facts remain
additive; unrelated subjects retain their own timestamps and policy.

Ownership must be unambiguous and acyclic across replicas. It is explicit and
limited to named nodes; shared references are not ownership. Ownership alone
neither deletes subjects nor makes arbitrary linked facts replaceable. Keep old
fragment snapshots and unknown facts; migration, pruning, conditional writes,
CRDTs, and cross-tab locking remain outside this change.

Evidence: a failing app compact-model test and competing edits without body
timestamps; workspace tests for inherited revision, whole-group timestamp ties,
missing scalar values, unknown facts, and invalid ownership; mounted browser
create/edit/reload/sync. OLDM separately repairs equivalent numeric literal
comparison and workspace normalizes literal tie keys by RDF lexical metadata.
Validation uses packed library artifacts in an isolated installation, with no
changes to the book or local-only dependencies in committed package manifests.
