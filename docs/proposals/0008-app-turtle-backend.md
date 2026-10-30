# Application-selected Turtle backend

M3.2, 2026-10-30. The user selects the published custom Turtle adapter for
margin-notes while keeping the shared `@muze-nl/oldm` default on N3.

The experiment passes all 68 application tests and removes roughly 52 KB of
minified code. Its temporary N3-named aliases are not a production interface.
The remaining obstacle is Metro-OLDM: it supplies explicit N3 parser/writer
options even when the selected OLDM context factory supplies different defaults.

The app composes OLDM Core with the Turtle parser, writer and patch writer in
`src/oldm.js`. Its bundle resolves `@muze-nl/oldm` to that module, including
imports made by workspace and transport packages. Node tests use the same
resolution. No shared package default or global object is changed.

Metro-OLDM should let `oldm.context(options)` select defaults and retain explicit
parser/writer/context overrides. Its default-writer error hint should compare
against the context factory's writer instead of an N3-specific export. This is
an existing configuration boundary, not a new backend registry or public API.

Validation: a middleware test installs a context factory with alternate defaults
and confirms they survive middleware creation and HTTP parsing. The application
suite exercises the published Turtle adapter; the build rejects N3 dependencies
in the browser output. N3 remains an independent development-only reference for
cross-backend tests. The shared OLDM N3 default is covered by its existing tests.

Validated on 2026-10-30: all 68 application tests pass with the production
Turtle selection and in each isolated backend comparison, including mounted
local persistence, mock-Solid connection/sync and mocked OIDC. Metro-OLDM passes
48 assertions; the shared OLDM package passes 27 assertions with N3 defaults.
Lint passes. Real-Pod testing remains a manual release check.
