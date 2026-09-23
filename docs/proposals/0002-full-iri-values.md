# Consume OLDM full-IRI values

The active M3.2 local-first note workflow must keep annotations visible after
Turtle load, edit, save, and reconnect. OLDM commit `341530e` now preserves full
class/datatype IRIs while retaining prefixed property names.

Baseline evidence: solid-tools has nine failing tests; margin-notes has six,
including four mounted-browser workflows. Stored annotation filters and fixture
classes still use shorthand values. Plain strings and xsd:string wrappers also
need to compare equally after the datatype contract changes. Container detection
must compare the full LDP class. The existing storage-discovery failure uses a
source prefix spelling different from the client default.

The change adds no library API. Update solid-tools comparisons, fixtures, and
examples to the OLDM contract. Keep graph-document merge and container detection
in their owning libraries. Update annotation vocabulary values and loading filters
in this application. Read legacy stored class shorthand using its document prefixes,
without rewriting storage merely because it was read. Preserve exact unknown IRIs
and literal text. Storage discovery should read predicates using the source graph's
property mapping.

Non-goals: new query APIs, generic migration infrastructure, permission changes,
publishing notes, or changing resource ownership.

Evidence: solid-workspace literal-merge tests, JSFS container tests, Metro profile
discovery tests, annotation-model legacy-load tests, and mounted local/Solid
create/restore/edit/delete/connect tests. Browser tests use disposable local
storage and fake Solid responses; they are not real-server conformance evidence.
