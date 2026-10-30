import { test } from 'node:test';
import assert from 'node:assert/strict';
import oldm from '@muze-nl/oldm';
import { createSolidResourceStore } from '../src/storage/solid-resource-store.js';

const url = 'https://pod.example/notes.ttl';
const turtle = '<urn:note> <https://schema.org/text> "note" .';

function client(overrides = {}) {
  return {
    get: async () => new Response(turtle, { headers: { 'Content-Type': 'text/turtle' } }),
    put: async () => new Response(null, { status: 204 }),
    delete: async () => new Response(null, { status: 204 }),
    ...overrides,
  };
}

test('SolidResourceStore: transports Turtle without application graph conversion', async () => {
  let saved;
  const store = createSolidResourceStore({ resourceUrl: url, solid: client({
    get: async (requested, options) => {
      assert.equal(requested, url);
      assert.equal(options.headers.Accept, 'text/turtle');
      return new Response(turtle, { headers: { 'Content-Type': 'text/turtle' } });
    },
    put: async (requested, options) => {
      assert.equal(requested, url);
      assert.equal(options.headers['Content-Type'], 'text/turtle');
      saved = options.body;
      return new Response(null, { status: 204 });
    },
  }) });
  assert.equal(await store.load(), turtle);
  await store.save({ value: turtle });
  assert.equal(saved, turtle);
});

test('SolidResourceStore: accepts native graphs from Metro OLDMed responses', async () => {
  const graph = oldm.context().parse(turtle, url, 'text/turtle');
  graph.set('urn:unrelated', 'schema$comment', oldm.literal('bonjour', { language: 'fr' }));
  const store = createSolidResourceStore({ resourceUrl: url, solid: client({ get: async () => graph }) });
  const loaded = oldm.context().parse(await store.load(), url, 'text/turtle');
  assert.equal(String(loaded.get('urn:note').schema$text), 'note');
  assert.equal(loaded.get('urn:unrelated').schema$comment.language, 'fr');
});

test('SolidResourceStore: missing resources return null, including Metro thrown responses', async () => {
  for (const get of [
    async () => new Response(null, { status: 404 }),
    async () => { throw new Error('missing', { cause: { status: 404 } }); },
  ]) {
    const store = createSolidResourceStore({ resourceUrl: url, solid: client({ get }) });
    assert.equal(await store.load(), null);
  }
});

test('SolidResourceStore: rejects JSON responses and document writes', async () => {
  const store = createSolidResourceStore({ resourceUrl: url, solid: client({
    get: async () => new Response('{"subjects":[]}', { headers: { 'Content-Type': 'application/json' } }),
  }) });
  await assert.rejects(store.load(), /text\/turtle/);
  await assert.rejects(store.save({ value: { subjects: [] } }), /Turtle text/);
});

test('SolidResourceStore: reports failed writes and treats missing deletes as complete', async () => {
  const store = createSolidResourceStore({ resourceUrl: url, solid: client({
    put: async () => new Response('permission denied', { status: 403 }),
    delete: async () => new Response(null, { status: 404 }),
  }) });
  await assert.rejects(store.save({ value: turtle }), /403.*permission denied/);
  assert.equal((await store.remove()).status, 404);
});

test('SolidResourceStore: uses the host key when no resource URL is configured', async () => {
  const store = createSolidResourceStore({ solid: client() });
  await assert.rejects(store.load(), /resourceUrl option or key/);
  assert.equal(await store.load({ key: url }), turtle);
});
