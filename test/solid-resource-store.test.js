import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSolidResourceStore } from '../src/storage/solid-resource-store.js';

test('SolidResourceStore: loads an opaque graph document from a configured resource', async () => {
  const graph = {
    format: 'margin-notes-oldmed-graph',
    subjects: [{
      id: 'https://pod.example/private/notes.json#note-1',
      rdf$type: 'oa$Annotation',
      schema$about: 'kept',
    }],
  };
  const solid = solidDouble([
    response(JSON.stringify(graph), { status: 200 }),
  ]);
  const store = createSolidResourceStore({
    resourceUrl: 'https://pod.example/private/notes.json',
    solid,
  });

  assert.deepEqual(await store.load({ key: 'ignored-local-key' }), graph);
  assert.deepEqual(solid.calls[0], {
    url: 'https://pod.example/private/notes.json',
    method: 'get',
    options: { accept: 'application/json' },
    body: undefined,
  });
});

test('SolidResourceStore: returns null when the configured resource does not exist yet', async () => {
  const store = createSolidResourceStore({
    resourceUrl: 'https://pod.example/private/missing-notes.json',
    solid: solidDouble([
      response('', { status: 404, statusText: 'Not Found' }),
    ]),
  });

  assert.equal(await store.load({ key: 'ignored-local-key' }), null);
});

test('SolidResourceStore: saves an opaque graph document with PUT', async () => {
  const solid = solidDouble([
    response('', { status: 201, statusText: 'Created' }),
  ]);
  const store = createSolidResourceStore({ solid });
  const value = {
    format: 'margin-notes-oldmed-graph',
    subjects: [{ id: 'urn:note:one', unknown$fact: true }],
  };

  const result = await store.save({
    key: 'https://pod.example/private/notes.json',
    value,
  });

  assert.deepEqual(result, {
    key: 'https://pod.example/private/notes.json',
    resourceUrl: 'https://pod.example/private/notes.json',
    status: 201,
  });
  assert.deepEqual(solid.calls[0], {
    url: 'https://pod.example/private/notes.json',
    method: 'put',
    options: { contentType: 'application/json; charset=utf-8' },
    body: `${JSON.stringify(value, null, 2)}\n`,
  });
});

test('SolidResourceStore: removes a resource with DELETE and treats missing resources as already removed', async () => {
  const solid = solidDouble([
    response(null, { status: 204, statusText: 'No Content' }),
    response('', { status: 404, statusText: 'Not Found' }),
  ]);
  const store = createSolidResourceStore({
    resourceUrl: 'https://pod.example/private/notes.json',
    solid,
  });

  assert.deepEqual(await store.remove({}), {
    key: 'https://pod.example/private/notes.json',
    resourceUrl: 'https://pod.example/private/notes.json',
    status: 204,
  });
  assert.deepEqual(await store.remove({}), {
    key: 'https://pod.example/private/notes.json',
    resourceUrl: 'https://pod.example/private/notes.json',
    status: 404,
  });
  assert.equal(solid.calls[0].method, 'delete');
  assert.equal(solid.calls[1].method, 'delete');
});

test('SolidResourceStore: reports failed Solid resource writes', async () => {
  const store = createSolidResourceStore({
    resourceUrl: 'https://pod.example/private/notes.json',
    solid: solidDouble([
      response('ACL denied', { status: 403, statusText: 'Forbidden' }),
    ]),
  });

  await assert.rejects(
    () => store.save({ value: { subjects: [] } }),
    /Solid resource save failed \(403 Forbidden\): ACL denied/
  );
});

test('SolidResourceStore: requires either a configured resourceUrl or a key', async () => {
  const store = createSolidResourceStore({
    solid: solidDouble([]),
  });

  await assert.rejects(
    () => store.load({}),
    /requires a resourceUrl option or key/
  );
});

test('SolidResourceStore: accepts a Metro thrower error for a missing resource', async () => {
  const missing = response('', { status: 404, statusText: 'Not Found' });
  const solid = {
    resource() {
      return {
        async get() {
          throw new Error('404: Not Found', { cause: missing });
        },
      };
    },
  };
  const store = createSolidResourceStore({
    resourceUrl: 'https://pod.example/private/missing-notes.json',
    solid,
  });

  assert.equal(await store.load({}), null);
});

function solidDouble(responses) {
  const calls = [];

  return {
    calls,
    resource(url) {
      return {
        async get(options) {
          calls.push({ url, method: 'get', options, body: undefined });
          return nextResponse({ responses, url });
        },
        async put(body, options) {
          calls.push({ url, method: 'put', options, body });
          return nextResponse({ responses, url });
        },
        async delete(options) {
          calls.push({ url, method: 'delete', options, body: undefined });
          return nextResponse({ responses, url });
        },
      };
    },
  };
}

function nextResponse({ responses, url }) {
  const next = responses.shift();
  if (!next) {
    throw new Error(`Unexpected Solid resource call to ${url}`);
  }
  return next;
}

function response(body, options = {}) {
  return new Response(body, {
    status: options.status,
    statusText: options.statusText,
    headers: options.headers,
  });
}
