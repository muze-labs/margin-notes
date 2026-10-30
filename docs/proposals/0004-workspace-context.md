# One working graph context

Active slice: M3.2. Design pressure: DP-007. Recorded: 2026-10-30.

The existing stack refactor guide already calls for one workspace-owned OLDM
context. This note records application evidence gathered during that refactor;
it was not a separate proposal approved before implementation.

A note's body must retain its graph identity through editing, saving, and
reconnecting. The application must also preserve facts outside its annotation
shape when it saves a resource. Existing workspace records and merged document
views gave callers separate object models and transport-owned nodes; direct
subject writes could omit other subjects in the resource.

The experiment imports each resource into one live workspace context, keeps
workspace source/status metadata alongside its graph, and delegates graph lookup
and provenance to OLDM. SimplySolid forwards an optional context. No annotation
or Cobalt vocabulary is added to either library.

The first browser integration run passed 55 of 57 tests. One test assumed an
`rdf$type` spelling instead of native OLDM `a`; the other exposed a real linked
body update regression: reconnect restored the old body text. A library contract
test reproduced the detached child. Collection updates now import changed named
subjects into their owning graph and preserve omitted facts. The browser test
uses the application's fragment accessor, since explicit JSON fragment literals are
represented as RDF literals after import.

Contracts cover shared context/provenance, source prefix conflicts, detached
snapshots, transport independence, complete resource saves, failed refresh,
stale handles, admitted save order, linked edits, native additions, container
creation, and source descriptor replacement. Existing replica failure and
ordering contracts remain in force.

The initial context-only implementation passed 57 application tests. After the
user requested removal of compatibility, obsolete migration/API tests were
removed and native contracts updated. All 42 current application tests, including
11 mounted browser tests, pass using packed local workspace and SimplySolid
builds in an isolated install. Repository
package dependencies still target published releases. These checks do not
establish real-Pod authentication or multi-device concurrency safety.

Successful reload/sync replaces graph instances: consumers must obtain fresh
nodes before editing again. The user subsequently requested removal of compatibility. Document APIs and
app migrations are now removed; adapters exchange Turtle and transient native
graph snapshots remain internal to save/sync. Native
Cobalt fragment RDF, manifests, SimplyFlow, JSFS, and
OLDM Shape changes remain separate work. No package has been published here.

The follow-up removed the old create/initialize host API, storageKey alias,
fragment/plain-text recovery, duplicate RDF copying, and separate custom-store
persistence path. Library coverage additionally checks configured source prefixes
after replica merge and rejection of implicit JSON predicate values. Mounted
browser coverage verifies unrelated subjects survive edits and reload.

Removing cloned updates means the app now edits the authoritative node and asks
SimplySolid's collection `save(id)` to persist it. This delegates to the existing
workspace save operation and preserves facade failure/status handling. A library
contract covers failed save and retry; mounted app tests cover edit and reload.
