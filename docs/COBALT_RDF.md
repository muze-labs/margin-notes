# Cobalt fragments in RDF

Margin notes owns the bridge in
[`cobalt-fragment-rdf.js`](../src/features/paragraph-note-stacks/cobalt-fragment-rdf.js).
Cobalt receives and returns its plain `{ text, annotations }` value. It has no
Turtle, OLDM, workspace, or storage dependency. OLDM parses and writes Turtle;
Solid Workspace persists the resource graph.

## Stored shape

```turtle
@prefix cobalt: <https://vocab.muze.nl/cobalt#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix oa: <http://www.w3.org/ns/oa#> .
@prefix schema: <https://schema.org/> .
@prefix dcterms: <http://purl.org/dc/terms/> .

<urn:note:body> a oa:TextualBody ;
    dcterms:format "text/plain" ;
    dcterms:modified "2026-10-30T12:00:00Z" ;
    rdf:value "Bold text" ;
    schema:text "Bold text" ;
    cobalt:fragment <urn:fragment:1> .

<urn:fragment:1> a cobalt:Fragment ;
    rdf:value "Bold text" ;
    cobalt:annotations ( <urn:fragment:1#annotation-0> ) .

<urn:fragment:1#annotation-0>
    cobalt:start 0 ;
    cobalt:end 4 ;
    cobalt:tag "<strong>" ;
    cobalt:order 1 .
```

The `cobalt:` terms are an application convention, not a Solid standard or a
new dependency of Cobalt. The existing namespace is retained; this document
specifies the mapping used here without claiming a published ontology.

| Value | Meaning |
| --- | --- |
| `rdf:value` on the fragment | Exact Cobalt text, stored as a string literal, including URI-looking text. |
| `cobalt:annotations` | One ordered RDF list, represented by an OLDM Collection. Duplicates and sequence are preserved. |
| `cobalt:start`, `cobalt:end` | Cobalt's half-open UTF-16 code-unit range, stored as integer literals. |
| `cobalt:tag` | Exact Cobalt tag string, such as `<strong>`, `</strong>` or `<a href="…">`. |
| `cobalt:order` | Integer formatting precedence; independent of list position. |

An empty list is `()` / `rdf:nil`. OLDM currently parses it as a named `rdf:nil`
node, which the bridge accepts and writes canonically. Non-empty lists use
`oldm.Collection`; ordinary arrays of RDF values are rejected as unordered.
Integer literals may have lexical string wrappers after parsing; the bridge
validates their datatype and converts them to Cobalt numbers. Invalid ranges,
missing fields and old JSON fragment literals are reported, not migrated.

## Editor boundary

The application can use the bridge with Cobalt's existing value API:

```js
import oldm from '@muze-nl/oldm';
import {
  readCobaltFragment, writeCobaltFragment,
} from './src/features/paragraph-note-stacks/cobalt-fragment-rdf.js';

const graph = oldm.context().parse(turtle, resourceUrl, 'text/turtle');
editor.setValue(readCobaltFragment(graph.get(fragmentId)));

const savedFragment = writeCobaltFragment(editor.getValue(), graph);
const outputTurtle = await graph.write();
```

These are application module exports, not additions to the Cobalt package API.
`writeCobaltFragment(fragment)` without a graph builds a detached native graph,
useful when constructing new annotation input for the workspace. With a graph,
it adds the snapshot there and returns its native node. The annotation model
links that node from the body, refreshes its plain-text fields and timestamps,
and asks SimplySolid to save the annotation's resource. The bridge performs no
I/O. `readCobaltFragment()` returns a fresh editor value; it does not detach or
replace authoritative RDF nodes.

## Edits and replicas

Each application edit creates a new fragment URI and new annotation URIs within
that snapshot. Annotation indices identify positions in that particular
snapshot; the Collection supplies order. The app never edits an old snapshot.
Named members let repeated imports recognize the same annotation facts rather
than trying to match independently parsed blank nodes by their field values.

The body keeps its identity. Its timestamped scalar `cobalt:fragment` link, plus
`rdf:value` and `schema:text`, select one complete edit under the existing
workspace replica policy. Formatting removal becomes a new snapshot with an
empty list; an old replica cannot add old annotations into that new list.

Unknown facts on the body, fragment, annotations and unrelated subjects remain
in the resource. Old fragment snapshots are retained as well. This increases
resource size over time; garbage collection and revision UI are separate work.
Unknown facts attached to an old snapshot are not automatically copied onto a
new snapshot whose text and range meanings may have changed.

## Evidence

- `test/cobalt-fragment-rdf.test.js`: Turtle round trips, sequence, duplicates,
  overlapping annotations, Unicode, empty lists, invalid inputs and independently
  authored Turtle using different prefixes.
- `test/annotation-model.test.js`: native graph ownership, unknown facts and
  competing replica edits, including removal of all formatting.
- `test/browser-mounted.test.js`: actual Cobalt modal values and rendered
  formatting survive Turtle save/remount; an unformatted edit survives reload.
