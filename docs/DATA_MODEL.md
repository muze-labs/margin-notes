# Initial Linked-Data Model

This is a starting hypothesis. The model should be revised when implementation or interoperability tests expose a better answer.

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

The exact prefixes and OLDM `$` property names should be generated from the selected contexts rather than manually duplicated across the codebase.

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

The initial vertical slice may use plain text. The architecture must allow a Cobalt body without requiring every consumer to understand Cobalt internals.

Possible approaches to test:

- a textual body with a media type;
- a linked body resource containing Cobalt data;
- a plain-text fallback alongside structured content.

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
