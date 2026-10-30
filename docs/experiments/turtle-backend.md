# Custom Turtle backend experiment

2026-10-30. Compare the existing margin-notes application with N3 and with
`@muze-labs/oldm-turtle`, first as an isolated experiment and then as the selected application backend.

Run from this repository after installing its dependencies:

```sh
npm run test:turtle -- /path/to/oldm/packages/oldm-turtle
```

The optional argument selects an adapter package directory. Without it, the
comparison uses installed `@muze-labs/oldm-turtle` 0.4.3, including the numeric
lexer fix below. Mounted tests require Google Chrome.

The script copies the app, tests and installed dependencies into a temporary
directory, builds each backend with identical minification settings, and runs
all Node and mounted-browser tests against each. It retains both bundles,
esbuild dependency reports, test logs and `results.json`. Normal build output
and installed packages remain unchanged.

Both builds compose OLDM Core with their selected adapters. Metro-OLDM 0.5.1
uses the context factory's defaults, so no N3-named substitutions are needed.
The native browser bundle must contain neither N3 nor the OLDM N3 adapter.
Interoperability tests retain N3 as an independent reader/writer reference.

## Results

| Backend | Application tests | Minified bytes | Gzip bytes | Brotli bytes |
| --- | --- | ---: | ---: | ---: |
| N3 | 68/68 pass | 385,002 | 111,660 | 95,394 |
| Published Turtle 0.4.3 | 68/68 pass | 333,165 | 96,830 | 82,757 |

This saves 51,837 bytes minified (13.5%), or 14,830 bytes with gzip.
Both rows are fresh source builds using the same settings; the book currently
minifies the already-built npm bundle, so its absolute size differs slightly.

All 66 existing application tests pass with the custom backend, including real
Cobalt editing, local persistence, mock-Solid synchronization and the mocked OIDC
flow. Both new cross-backend fixtures now pass. Separately, the custom
adapter suite passes all 201 assertions, including 56 new numeric regressions.

The initial run passed 67/68 application tests. The new cross-backend
formatted-note fixture failed when the custom parser read N3 output. N3 writes an integer immediately followed by a statement terminator:

```turtle
<urn:format> <https://vocab.muze.nl/cobalt#order> 1.
```

The custom numeric lexer consumed `1.` as a decimal and then reported a missing
statement terminator. Turtle decimals require digits after the decimal point;
this input is an integer followed by punctuation. See the
[Turtle 1.1 numeric grammar](https://www.w3.org/TR/turtle/#grammar-production-DECIMAL).
Its own writer inserts a space before the period, which explains why ordinary
same-backend round trips did not reveal this failure.

The lexer now matches exponent forms first, then decimals requiring fractional
digits, then integers. This keeps `1.e2` valid while leaving the period in `1.`
for statement parsing. The new `packages/oldm-turtle/test/numeric.test.mjs`
regressions cover signs, large integer lexical values, decimals, exponents,
adjacent statements, comments, Collections and malformed numeric forms. They
reproduced failures before the fix and pass afterward, with N3 as a reference.

The successful comparison confirms the native browser bundle contains no N3.
Following the comparison, D055 selects published Turtle 0.4.3 only for the
margin-notes application. Shared OLDM continues to default to N3. Passing
these application fixtures does not establish full Turtle conformance or
real-Pod interoperability; other malformed input, more varied external Turtle
and arbitrary unknown RDF need separate coverage.

The book preview built from packed Metro-OLDM 0.5.1 and margin-notes 0.1.6
passes reader controls and formatted-note create/edit/persistence checks in a
fresh browser profile. Its minified installed bundle is 335,699 bytes (97,065
gzip), down from 387,903 (112,062 gzip). The native writer uses explicit typed
numeric literals such as `"7"^^xsd:integer`, so `xsd:` is now a used prefix;
this is equivalent RDF to N3's integer shorthand. These tests cover local
storage and mocked Solid services, not a live Pod.
