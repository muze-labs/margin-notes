import { test } from 'node:test';
import assert from 'node:assert/strict';
import oldm from '@muze-nl/oldm';
import { n3Parser, n3Writer, n3PatchWriter } from '@muze-nl/oldm-n3';
import { readCobaltFragment, writeCobaltFragment } from '../src/features/paragraph-note-stacks/cobalt-fragment-rdf.js';

// N3 remains an independent reference in Node tests, never in the experimental
// browser bundle. The experiment replaces oldm's defaults for the whole stack.
const reference = () => oldm.context({ parser: n3Parser, writer: n3Writer, patchWriter: n3PatchWriter });
const backends = () => [oldm.context(), reference()];
const property = (node, predicate) => node[node.graph.propertyName(predicate)];

test('Turtle interoperability: either writer can persist formatted notes for either reader', async () => {
  const id = 'https://book.example/chapter#margin-note-Abcd1234-1-fragment';
  const fragment = {
    text: '😀 café "quoted"\nbackslash \\',
    annotations: [
      { range: [0, 2], tag: '<strong>', order: 1 },
      { range: [3, 7], tag: '<em>', order: 2 },
      { range: [3, 7], tag: '<em>', order: 2 },
    ],
  };
  const node = writeCobaltFragment(fragment, { id, htmlId: id.replace('-fragment', '-html') });
  node.graph.set(id, 'schema$description', oldm.literal('onbekend', { language: 'nl' }));
  for (const writer of backends()) {
    const turtle = await writer.writer(node.graph);
    for (const reader of backends()) {
      const graph = reader.parse(turtle, 'https://pod.example/notes.ttl', 'text/turtle');
      const restored = graph.get(id);
      assert.deepEqual(readCobaltFragment(restored), fragment);
      assert.equal(String(restored.schema$description), 'onbekend');
      assert.equal(restored.schema$description.language, 'nl');
      assert.equal(String(restored.dcterms$hasFormat.dcterms$format), 'text/html');
      assert.equal(String(restored.dcterms$hasFormat.rdf$value), String(node.dcterms$hasFormat.rdf$value));
    }
  }
});

test('Turtle interoperability: profile namespaces, blank nodes and empty Collections survive either writer', async () => {
  const url = 'https://pod.example/profile/card#me';
  const turtle = `
    @prefix http: <http://> .
    @prefix https: <https://> .
    @prefix pim: <http://www.w3.org/ns/pim/space#> .
    @prefix schema: <https://schema.org/> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
    <#me> pim:storage <../>; schema:url https:example.org;
      schema:description "bonjour"@fr;
      schema:about [ schema:name "Shared" ]; schema:itemListElement ();
      schema:ratingValue "12.50"^^xsd:decimal .
  `;
  for (const writer of backends()) {
    const graph = writer.parse(turtle, url, 'text/turtle');
    for (const reader of backends()) {
      const me = reader.parse(await writer.writer(graph), url, 'text/turtle').get(url);
      assert.equal(property(me, 'http://www.w3.org/ns/pim/space#storage').id, 'https://pod.example/');
      assert.equal(property(me, 'https://schema.org/url').id, 'https://example.org');
      assert.equal(property(me, 'https://schema.org/description').language, 'fr');
      assert.equal(String(property(property(me, 'https://schema.org/about'), 'https://schema.org/name')), 'Shared');
      assert.equal(property(me, 'https://schema.org/itemListElement').id, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil');
      assert.equal(String(property(me, 'https://schema.org/ratingValue')), '12.50');
      assert.equal(property(me, 'https://schema.org/ratingValue').type, 'http://www.w3.org/2001/XMLSchema#decimal');
    }
  }
});
