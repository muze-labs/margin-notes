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

- `rdf$type`
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

Example OLDMed object:

```js
{
  id: 'urn:uuid:...',
  rdf$type: 'oa$Annotation',
  dcterms$created: '2026-07-19T10:00:00.000Z',
  dcterms$modified: '2026-07-19T10:00:00.000Z',
  oa$hasBody: {
    id: 'urn:uuid:...#body',
    rdf$type: ['oa$TextualBody', 'cobalt$Fragment'],
    dcterms$format: 'application/vnd.cobalt.fragment+json',
    rdf$value: 'This paragraph makes the boundary visible.',
    schema$text: 'This paragraph makes the boundary visible.',
    cobalt$fragment: { text: 'This paragraph makes the boundary visible.', annotations: [] }
  },
  oa$hasTarget: {
    id: 'urn:uuid:...#target',
    rdf$type: 'oa$SpecificResource',
    oa$hasSource: 'https://book.example/chapter/7',
    oa$hasSelector: {
      id: 'urn:uuid:...#selector-fragment',
      rdf$type: 'oa$FragmentSelector',
      rdf$value: 'p-chapter7-boundary-visible'
    }
  }
}
```

Browser-local storage currently writes a small document containing `format`, `version`, `prefixes`, and `subjects`. This is still JSON, but the subject objects already use the native OLDMed property names expected from OLDM.

The local store itself stores opaque values by key. It does not know about annotations, OLDMed, or Cobalt. Annotation-specific conversion belongs to the note feature API.

The first Solid-backed storage slice writes the same annotation graph to one configured Solid resource through `createSolidResourceStore()`. The adapter uses a Lading-style client and OLDM to translate between the app-facing graph document and Turtle. This is a deliberate boundary test: Solid resource persistence can be real linked data without teaching the note UI a second model. Source-aware multi-resource modelling should wait for a slice that needs cross-application editing or real linked-data resource composition across several resources.

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

The initial vertical slice preserves the Cobalt body in its minimal JSON format under `cobalt$fragment` when writing to browser-local storage. The body also stores plain text through `rdf$value` and `schema$text` so the annotation is not useful only to Cobalt-aware consumers.

Possible approaches to test:

- a textual body with a media type;
- a linked body resource containing Cobalt data;
- a plain-text fallback alongside structured content.

The `cobalt$fragment` predicate remains a Muze convention to revisit when Solid and interoperability work begin.

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
