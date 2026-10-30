# Resource Turtle base independent of source location

The current application needs direct paragraph targets to serialize as
`<#paragraph>` under the page URL (DP-011). Keep storage addresses and provenance
unchanged. Add optional `baseURI` to the existing resource configuration, forward
it through SimplySolid, retain it on replica reconfiguration, and apply it to
working graphs and merged snapshots. Copies preserve their source graph base.
No page or annotation vocabulary belongs in the library.

Incoming Turtle must first resolve against its own retrieval URL and declared
base. Only afterward may the configured output base be applied. This avoids
changing the identity of relative facts from another document. The library
regression exercises distinct input bases, local save, remote merge, reconnect,
reload and the actual network destination. Mounted app tests cover compact
output for both local and remote persistence; the book smoke test checks the
packed implementation in the running page.
