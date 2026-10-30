# Initial Linked-Data Model

This is a starting hypothesis. The model should be revised when implementation or interoperability tests expose a better answer.

## Selected M1.1 Object Shape

M1.1 selected OLDMed JavaScript property names before the application had a direct OLDM-backed resource model. The goal is to let application code use the same names that OLDM exposes from parsed linked data.

Stored annotation subjects currently use these prefixes:

| Prefix | Namespace | Status |
|---|---|---|
| `rdf` | `http://www.w3.org/1999/02/22-rdf-syntax-ns#` | W3C standard |
| `rdfs` | `http://www.w3.org/2000/01/rdf-schema#` | W3C standard |
| `dcterms` | `http://purl.org/dc/terms/` | established vocabulary |
| `oa` | `http://www.w3.org/ns/oa#` | W3C Web Annotation vocabulary |
| `schema` | `https://schema.org/` | established vocabulary |
| `cobalt` | `https://vocab.muze.nl/cobalt#` | Muze application convention for Cobalt bodies |

The current note graph uses:

- `a`
- `dcterms$created`
- `dcterms$modified`
- `dcterms$format`
- `dcterms$hasFormat`
- `rdf$value`
- `oa$Annotation`
- `oa$TextualBody`
- `oa$hasBody`
- `oa$hasTarget`
- `cobalt$Fragment`
- `cobalt$fragment`

The Cobalt predicate is a Muze convention linking the annotation to its editable
fragment. Its `rdf:value` stores raw text. Standard OA readers follow `oa:hasBody`
to generated HTML with its own `rdf:value` and `dcterms:format "text/html"`. The
fragment links to that HTML node through `dcterms:hasFormat`.

Example OLDMed input (`writeCobaltFragment` comes from the application
[Cobalt RDF bridge](COBALT_RDF.md); string body values are explicit OLDM literals
in the implementation):

```js
const fragment = writeCobaltFragment(
  { text: 'This paragraph makes the boundary visible.', annotations: [] },
  {
    id: 'https://book.example/chapter/7#margin-note-Abcd1234-1-fragment',
    htmlId: 'https://book.example/chapter/7#margin-note-Abcd1234-1-html',
  }
);
const annotation = {
  id: 'https://book.example/chapter/7#margin-note-Abcd1234-1',
  a: 'http://www.w3.org/ns/oa#Annotation',
  dcterms$created: '2026-07-19T10:00:00.000Z',
  dcterms$modified: '2026-07-19T10:00:00.000Z',
  oa$hasBody: fragment.dcterms$hasFormat,
  cobalt$fragment: fragment,
  oa$hasTarget: 'https://book.example/chapter/7#p-chapter7-boundary-visible'
};
```

Local and remote resources persist Turtle. Solid Workspace owns the native OLDM
context and source graphs; annotation code reads those nodes directly. There is
no application graph-document format, copy/merge implementation, or migration of
old stored JSON. Cobalt fragments are native RDF nodes with text literals and
ordered annotation Collections. The editor still uses its plain value API;
the application bridge owns the mapping.

Default IndexedDB and custom host stores both run through the SimplySolid notes
resource. `createSolidResourceStore()` transports Turtle to a fixed Solid URL;
it has no annotation vocabulary, fragment repair, or subject projection.

## Prefer existing annotation terms

The W3C Web Annotation vocabulary is the natural starting point:

- `oa:Annotation`
- `oa:hasBody`
- `oa:hasTarget`
- `oa:TextualBody`
- `oa:hasSelector`
- `oa:FragmentSelector`
- `oa:TextQuoteSelector`
- `oa:TextPositionSelector`
- `oa:exact`, `oa:prefix`, and `oa:suffix`

Additional common terms may include:

- `dcterms:created`
- `dcterms:modified`
- `dcterms:creator`
- `schema:text` or an editor-specific body format where justified

The M1.1 prefixes and `$` property names are now selected above. They remain implementation evidence rather than a final interoperability claim until the browser workflow and later Solid-backed save path validate them.

## Example graph

Current targets are direct paragraph IRIs:

```turtle
@prefix note: <https://book.example/chapter/7#margin-note-Abcd1234-> .
@prefix oa: <http://www.w3.org/ns/oa#> .

note:1 a oa:Annotation ;
    oa:hasBody note:1-html ;
    oa:hasTarget <https://book.example/chapter/7#p-chapter7-boundary-visible> .
```

The body and fragment structure is shown in [Cobalt RDF](COBALT_RDF.md).
Only prefixes used in the serialized graph are written. The page URL is the
Turtle `@base`, so the target above serializes as `<#p-chapter7-boundary-visible>`.
The `note:` prefix remains available for annotation, body and fragment IDs.
This serialization base is independent of the IndexedDB or Pod storage URL.

## Identity

### Annotation identity

New annotation IDs use the current page URL (without its fragment), followed by
`#margin-note-<code>-<counter>`. One eight-character random code is shared by the
notes in a resource. Existing IDs recover the code and highest counter after
reload; tombstones reserve deleted IDs. A mounted app also reserves counters
before asynchronous writes finish. No separate identifier metadata is stored.
HTML bodies append `-html` and the current fragment appends `-fragment` to the
annotation ID. Formatting members append `-<index>` to the fragment ID.
The single resource code is included in `note:` itself, leaving `note:1`,
`note:1-fragment` and `note:1-fragment-0` in the output. No fragment revision IDs
or history are stored. Targets are direct paragraph URLs.

IDs remain unchanged after editing, syncing, or moving the page. The current
page URL includes its query string; localhost, mirrors and alternative URLs do
not automatically become one canonical page. Existing annotations are not
renamed. If separately initialized resources are merged, their existing codes
remain and a fresh mount chooses the lexically first code for future notes.

A shared counter is not safe against concurrent offline creation by multiple
devices or tabs: they can allocate the same next ID. Coordination is future work.
Random-code collisions are also possible, though the code uses 48 random bits.
The page-based identifier does not locate the private Pod data or authorize
access to it. Opening it retrieves the page and requires application-specific
fragment handling to display the note.

### Target identity

`oa:hasTarget` points directly to the page URL plus the percent-encoded paragraph
ID. Resolution requires the current page URL to match, then decodes its fragment.
Missing or invalid fragments and targets on other pages are not displayed as
current-page notes. New notes create no SpecificResource or FragmentSelector
nodes. Existing structured targets are not migrated or supported as a fallback.
Quote and position selectors remain possible future work if stable paragraph IDs
prove insufficient.

## Body formats

The annotation links to its native fragment with `cobalt:fragment`, and to its
HTML body with `oa:hasBody`. The fragment stores editable text and ordered Cobalt
annotations, and owns the generated HTML representation via `dcterms:hasFormat`.
The HTML node is an `oa:TextualBody` with one string `rdf:value` and
`dcterms:format "text/html"`. Text and HTML are intentionally both persisted.
See [Cobalt RDF](COBALT_RDF.md) for the mapping and editor boundary.
There is no automatic conversion of previous stored models.

## Collections and resources

A resource may contain several annotations. An application view may combine annotations from several resources. Neither relationship should be mistaken for ownership:

- one resource is not necessarily one collection;
- one collection is not necessarily one resource;
- one application is not necessarily one container.

## Open-world behaviour

The application must preserve:

- unfamiliar properties on known subjects;
- unfamiliar linked subjects reachable from a known annotation where they are part of the loaded working graph;
- additional types;
- language-tagged and typed literals it does not edit.

Validation should check the facts required for the operation, not reject every fact outside the application shape.

## Deletion

Deletion semantics require a deliberate decision:

- remove the annotation subject from a multi-annotation resource;
- delete a dedicated annotation resource;
- mark a note as retracted;
- remove only a publication or submission copy.

The correct operation depends on source ownership and sharing state.

## Editable replica metadata — 2026-10-30

The default local and remote replicas persist Turtle through Solid Workspace.
Custom host stores also load and save Turtle through a workspace source.
Only annotations carry `dcterms:modified`. The application declares the fragment link, its `dcterms:hasFormat` link to HTML,
and its formatting Collection link as ownership. The annotation's timestamp
selects raw text, HTML, Collection membership and formatting fields together, using the
policy in `annotation-model.js`. Unfamiliar facts remain additive. Edits replace
the current fragment; removed formatting fields are cleared without keeping a
historical snapshot. No ownership metadata is stored in Turtle.

Workspace marks the deleted annotation itself with
`https://purl.org/pdsinterop/link-metadata#deleted` and `dcterms:modified`.
The deletion predicate comes from the PDS Interop Solid Link Metadata vocabulary;
timestamp-based replica reconciliation is library policy. The subject and its
facts survive persistence but are excluded from collection views. Linked
body facts are not implicitly deleted.
The default connection no longer projects remote graphs through the annotation-only
fixed-resource store, so unrelated subjects and tombstones stay in the resource.
