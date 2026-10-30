# Preserve prefix declarations across graph merges

The current app's compact page-based identifiers require its `note:` declaration
to survive replica merging (DP-010). Keep non-conflicting prefix labels from all
inputs; for conflicting labels keep the first mapping. Import facts through their
full IRIs, preserving meaning independently of the chosen abbreviations. OLDM
continues to omit declarations unused in serialized output. No application
vocabulary or serialization workaround enters the workspace API.

Contract evidence: the workspace persistence test covers a later graph's prefix,
conflicting labels, Turtle round trip, and unchanged source declarations.
Integration evidence: the mounted app sync test verifies the remote saved Turtle
retains `note:`. This is graph-copy fidelity, with no new public options.
