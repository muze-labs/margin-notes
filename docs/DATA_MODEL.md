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
- `rdf$value`
- `schema$text`
- `oa$Annotation`
- `oa$TextualBody`
- `oa$SpecificResource`
- `oa$FragmentSelector`
- `oa$hasBody`
- `oa$hasTarget`
- `oa$hasSource`
- `oa$hasSelector`
- `cobalt$Fragment`
- `cobalt$fragment`

The Cobalt predicate is intentionally marked as a Muze convention. It preserves the editor fragment for this application while `rdf$value` and `schema$text` provide a plain-text body for consumers that do not understand Cobalt.

Example OLDMed input (`writeCobaltFragment` comes from the application
[Cobalt RDF bridge](COBALT_RDF.md); string body values are explicit OLDM literals
in the implementation):

```js
{
  id: 'urn:uuid:...',
  a: 'http://www.w3.org/ns/oa#Annotation',
  dcterms$created: '2026-07-19T10:00:00.000Z',
  dcterms$modified: '2026-07-19T10:00:00.000Z',
  oa$hasBody: {
    id: 'urn:uuid:...#body',
    a: 'http://www.w3.org/ns/oa#TextualBody',
    dcterms$format: 'text/plain',
    rdf$value: 'This paragraph makes the boundary visible.',
    schema$text: 'This paragraph makes the boundary visible.',
    cobalt$fragment: writeCobaltFragment({ text: 'This paragraph makes the boundary visible.', annotations: [] })
  },
  oa$hasTarget: {
    id: 'urn:uuid:...#target',
    a: 'http://www.w3.org/ns/oa#SpecificResource',
    oa$hasSource: 'https://book.example/chapter/7',
    oa$hasSelector: {
      id: 'urn:uuid:...#selector-fragment',
      a: 'http://www.w3.org/ns/oa#FragmentSelector',
      rdf$value: 'p-chapter7-boundary-visible'
    }
  }
}
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

Illustrative Turtle:

```turtle
<#note-1>
    a oa:Annotation ;
    dcterms:creator <https://user.example/profile/card#me> ;
    dcterms:created "2026-07-17T12:00:00Z"^^xsd:dateTime ;
    oa:hasBody <#body-1> ;
    oa:hasTarget <#target-1> .

<#body-1>
    a oa:TextualBody ;
    rdf:value "This paragraph makes the boundary visible." .

<#target-1>
    oa:hasSource <https://book.example/chapter/7> ;
    oa:hasSelector <#fragment-1>, <#quote-1> .

<#fragment-1>
    a oa:FragmentSelector ;
    rdf:value "paragraph-boundaries-are-real" .

<#quote-1>
    a oa:TextQuoteSelector ;
    oa:exact "Dependencies are not a problem..." ;
    oa:prefix "The boundary matters because " ;
    oa:suffix " They become a problem when..." .
```

This example is not yet a normative shape.

## Identity

### Annotation identity

A note should have a persistent subject identifier. When stored in a resource, a fragment identifier such as `notes.ttl#note-1` is a reasonable default. Local notes should still receive stable identifiers rather than anonymous array positions.

The browser-storage representation may use an application-controlled local URL namespace until the note is deliberately copied to a Solid resource. Copying may create a new subject and record derivation; it must not silently mutate identity if another application could already refer to the local identifier.

### Target identity

The source document URL and the selector are separate. A fragment may be stable while text moves; a quote may survive a changed fragment; neither is guaranteed.

Target resolution should therefore support multiple selectors and report its result.

## Body formats

The body stores interoperable plain text through `rdf:value` and `schema:text`
and links to a native fragment using `cobalt:fragment`. The fragment has its own
text literal and ordered `cobalt:annotations` RDF list. Annotation nodes preserve
Cobalt's range, tag and precedence fields. See [Cobalt RDF](COBALT_RDF.md) for the
exact mapping, UTF-16 offsets, empty lists, editor API and snapshot semantics.
There is no JSON fragment literal or automatic conversion of old stored data.

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
Annotations and editable bodies carry `dcterms:modified`. The application declares
`rdf:value`, `schema:text`, and `cobalt:fragment` as replaceable scalar fields;
workspace applies the timestamp policy and unions unknown facts.

Workspace marks the deleted annotation itself with
`https://purl.org/pdsinterop/link-metadata#deleted` and `dcterms:modified`.
The deletion predicate comes from the PDS Interop Solid Link Metadata vocabulary;
timestamp-based replica reconciliation is library policy. The subject and its
facts survive persistence but are excluded from collection views. Linked
body/target facts are not implicitly deleted.
The default connection no longer projects remote graphs through the annotation-only
fixed-resource store, so unrelated subjects and tombstones stay in the resource.
