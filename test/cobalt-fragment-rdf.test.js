import { test } from 'node:test';
import assert from 'node:assert/strict';
import oldm from '@muze-nl/oldm';
import {
  readCobaltFragment, writeCobaltFragment,
} from '../src/features/paragraph-note-stacks/cobalt-fragment-rdf.js';

const fragment = {
  text: '😀 https://example.test/\n"quoted"',
  annotations: [
    { range: [0, 2], tag: '<strong>', order: 7 },
    { range: [0, 24], tag: '<em>', order: 2 },
    { range: [3, 24], tag: '<a href="https://example.test/">', order: 9 },
    { range: [0, 2], tag: '<strong>', order: 7 },
  ],
};

test('Cobalt RDF: Turtle preserves list order, duplicates, ranges and precedence', async () => {
  const node = writeCobaltFragment(fragment);
  assert.ok(node.cobalt$annotations instanceof oldm.Collection);
  assert.deepEqual(readCobaltFragment(node), fragment);
  const turtle = await node.graph.write();
  assert.match(turtle, /cobalt:annotations\s+\(/);
  assert.doesNotMatch(turtle, /fragment\+json|\\"annotations\\"/);
  const graph = oldm.context().parse(turtle, node.graph.url, 'text/turtle');
  const restored = graph.get(node.id);
  assert.ok(restored.cobalt$annotations instanceof oldm.Collection);
  assert.deepEqual(readCobaltFragment(restored), fragment);
  const view = readCobaltFragment(restored);
  view.annotations[0].range[0] = 1;
  assert.deepEqual(readCobaltFragment(restored), fragment);
});

test('Cobalt RDF: empty text and annotation lists survive Turtle', async () => {
  const empty = { text: '', annotations: [] };
  const node = writeCobaltFragment(empty);
  const graph = oldm.context().parse(
    await node.graph.write(), node.graph.url, 'text/turtle',
  );
  assert.deepEqual(readCobaltFragment(graph.get(node.id)), empty);
});

test('Cobalt RDF: malformed values fail instead of silently losing formatting', () => {
  assert.throws(() => readCobaltFragment('old JSON'), /cobalt-fragment-rdf/);
  const node = writeCobaltFragment(fragment);
  node.cobalt$annotations = Array.from(node.cobalt$annotations);
  assert.throws(() => readCobaltFragment(node), /Collection/);
  for (const annotation of [
    { range: [-1, 2], tag: '<strong>', order: 1 },
    { range: [0, 200], tag: '<strong>', order: 1 },
    { range: [3, 2], tag: '<strong>', order: 1 },
    { range: [0, 2], tag: '<strong>' },
  ]) {
    assert.throws(() => writeCobaltFragment({
      text: fragment.text, annotations: [annotation],
    }), /cobalt-fragment-rdf/);
  }
});

test('Cobalt RDF: reads independently authored Turtle with different prefixes', () => {
  const graph = oldm.context().parse(`
    @prefix c: <https://vocab.muze.nl/cobalt#> .
    @prefix r: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
    <urn:fragment> a c:Fragment; r:value "Bold";
      c:annotations ( <urn:format> <urn:format> ) .
    <urn:format> c:start 0; c:end 4; c:tag "<strong>"; c:order 3 .
  `, 'https://example.test/fragment.ttl', 'text/turtle');
  assert.deepEqual(readCobaltFragment(graph.get('urn:fragment')), {
    text: 'Bold', annotations: [
      { range: [0, 4], tag: '<strong>', order: 3 },
      { range: [0, 4], tag: '<strong>', order: 3 },
    ],
  });
});
