# Current fragments and compact resource serialization

Active need: DP-012. The user excludes revision history and collaborative editing.

The app reuses one fragment ID and formatting member IDs, replacing its mapped
fields and clearing removed members' mapped facts. It preserves unknown RDF and
adds no migration or history sweep. Its existing owned/scalar policy now covers
the body, fragment, ordered Collection and formatting fields together. A failing
app test with two empty lists demonstrates that the workspace must treat rdf:nil
as an empty Collection rather than an owned subject. No Cobalt vocabulary enters
the workspace.

The app recovers one resource code from existing note IDs and places it in the
note prefix, allocating only when the first note is created. Resource `prefixes`
preferences pass through SimplySolid and persist across reconnects. Solid Workspace
applies them to save copies and merged output, importing full IRIs before choosing
new property abbreviations; editing graph prefixes in place would reinterpret
unknown predicates. Incoming data still resolves with its own namespace mappings.

Contract tests cover Collection replacement/removal, empty lists, stale replicas,
whole-value timestamp ties, unknown member facts, and changed prefix mappings.
App integration checks repeated edits produce one fragment, stale formatting
stays removed, two unformatted notes sync, and saved Turtle uses note:1. Mounted
and packed live-book checks validate the actual editor/storage path.
