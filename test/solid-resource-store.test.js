import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSolidResourceStore } from '../src/storage/solid-resource-store.js';

test('SolidResourceStore: loads a Turtle resource into an OLDMed graph document', async () => {
  const turtle = turtleFixture({ text: 'A linked-data note' });
  const solid = solidDouble([
    response(turtle, {
      status: 200,
      headers: { 'Content-Type': 'text/turtle' },
    }),
  ]);
  const store = createSolidResourceStore({
    resourceUrl: 'https://pod.example/private/notes.ttl',
    solid,
  });

  const document = await store.load({ key: 'ignored-local-key' });

  assert.equal(document.format, 'margin-notes-oldmed-graph');
  assert.equal(document.version, 1);
  assert.equal(document.subjects[0].id, 'https://pod.example/private/notes.ttl#note-1');
  assert.equal(document.subjects[0].rdf$type, 'oa$Annotation');
  assert.equal(document.subjects[0].schema$about, 'https://example.test/topic');
  assert.equal(document.subjects[0].oa$hasBody.rdf$value, 'A linked-data note');
  assert.equal(document.subjects[0].oa$hasBody.schema$comment, 'keep this body fact');
  assert.deepEqual(document.subjects[0].oa$hasBody.cobalt$fragment, {
    text: 'A linked-data note',
    annotations: [],
  });
  assert.equal(document.subjects[0].oa$hasTarget.oa$hasSelector.rdf$value, 'p-chapter-boundaries');
  assert.deepEqual(solid.calls[0], {
    url: 'https://pod.example/private/notes.ttl',
    method: 'get',
    options: { accept: 'text/turtle, application/ld+json;q=0.9, application/json;q=0.2' },
    body: undefined,
  });
});

test('SolidResourceStore: recovers conventional note parts when linking triples are missing', async () => {
  const solid = solidDouble([
    response(orphanedPartsTurtle(), {
      status: 200,
      headers: { 'Content-Type': 'text/turtle' },
    }),
    response('', { status: 201, statusText: 'Created' }),
  ]);
  const store = createSolidResourceStore({
    resourceUrl: 'https://pod.example/private/notes.ttl',
    solid,
  });

  const document = await store.load({});

  assert.equal(document.subjects.length, 1);
  assert.equal(document.subjects[0].oa$hasBody.rdf$value, 'blabla');
  assert.equal(document.subjects[0].oa$hasTarget.oa$hasSelector.rdf$value, 'p-01-this-book-does-not-teach-you-how-to');

  await store.save({ value: document });
  const turtle = await solid.calls[1].body.write();

  assert.match(turtle, /oa:hasBody <urn:uuid:3b46ac04-cd34-4e2b-a44c-6f56d08c9df3#body>/);
  assert.match(turtle, /oa:hasTarget <urn:uuid:3b46ac04-cd34-4e2b-a44c-6f56d08c9df3#target>/);
  assert.match(turtle, /oa:hasSelector <urn:uuid:3b46ac04-cd34-4e2b-a44c-6f56d08c9df3#selector-fragment>/);
});

test('SolidResourceStore: returns null when the configured resource does not exist yet', async () => {
  const store = createSolidResourceStore({
    resourceUrl: 'https://pod.example/private/missing-notes.ttl',
    solid: solidDouble([
      response('', { status: 404, statusText: 'Not Found' }),
    ]),
  });

  assert.equal(await store.load({ key: 'ignored-local-key' }), null);
});

test('SolidResourceStore: rejects non-document JSON instead of treating it as empty notes', async () => {
  const store = createSolidResourceStore({
    resourceUrl: 'https://pod.example/private/notes.ttl',
    solid: solidDouble([
      response('false', {
        status: 200,
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      }),
    ]),
  });

  await assert.rejects(
    () => store.load({}),
    /JSON that is not a notes document/
  );
});

test('SolidResourceStore: saves an OLDMed graph document as Turtle with PUT', async () => {
  const solid = solidDouble([
    response('', { status: 201, statusText: 'Created' }),
  ]);
  const store = createSolidResourceStore({ solid });
  const value = graphDocument({
    resourceUrl: 'https://pod.example/private/notes.ttl',
    text: 'A Turtle-backed note',
  });

  const result = await store.save({
    key: 'https://pod.example/private/notes.ttl',
    value,
  });
  const turtle = await solid.calls[0].body.write();

  assert.deepEqual(result, {
    key: 'https://pod.example/private/notes.ttl',
    resourceUrl: 'https://pod.example/private/notes.ttl',
    status: 201,
  });
  assert.equal(solid.calls[0].url, 'https://pod.example/private/notes.ttl');
  assert.equal(solid.calls[0].method, 'put');
  assert.deepEqual(solid.calls[0].options, { contentType: 'text/turtle' });
  assert.match(turtle, /oa:Annotation/);
  assert.match(turtle, /oa:hasBody <https:\/\/pod\.example\/private\/notes\.ttl#note-1-body>/);
  assert.match(turtle, /cobalt:fragment/);
  assert.match(turtle, /A Turtle-backed note/);
});

test('SolidResourceStore: removes a resource with DELETE and treats missing resources as already removed', async () => {
  const solid = solidDouble([
    response(null, { status: 204, statusText: 'No Content' }),
    response('', { status: 404, statusText: 'Not Found' }),
  ]);
  const store = createSolidResourceStore({
    resourceUrl: 'https://pod.example/private/notes.ttl',
    solid,
  });

  assert.deepEqual(await store.remove({}), {
    key: 'https://pod.example/private/notes.ttl',
    resourceUrl: 'https://pod.example/private/notes.ttl',
    status: 204,
  });
  assert.deepEqual(await store.remove({}), {
    key: 'https://pod.example/private/notes.ttl',
    resourceUrl: 'https://pod.example/private/notes.ttl',
    status: 404,
  });
  assert.equal(solid.calls[0].method, 'delete');
  assert.equal(solid.calls[1].method, 'delete');
});

test('SolidResourceStore: reports failed Solid resource writes', async () => {
  const store = createSolidResourceStore({
    resourceUrl: 'https://pod.example/private/notes.ttl',
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
    resourceUrl: 'https://pod.example/private/missing-notes.ttl',
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

function graphDocument({ resourceUrl, text }) {
  return {
    format: 'margin-notes-oldmed-graph',
    version: 1,
    prefixes: {
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      dcterms: 'http://purl.org/dc/terms/',
      oa: 'http://www.w3.org/ns/oa#',
      schema: 'https://schema.org/',
      cobalt: 'https://vocab.muze.nl/cobalt#',
    },
    subjects: [{
      id: `${resourceUrl}#note-1`,
      rdf$type: 'oa$Annotation',
      schema$about: 'https://example.test/topic',
      oa$hasBody: {
        id: `${resourceUrl}#note-1-body`,
        rdf$type: ['oa$TextualBody', 'cobalt$Fragment'],
        dcterms$format: 'application/vnd.cobalt.fragment+json',
        rdf$value: text,
        schema$text: text,
        schema$comment: 'keep this body fact',
        cobalt$fragment: { text, annotations: [] },
      },
      oa$hasTarget: {
        id: `${resourceUrl}#note-1-target`,
        rdf$type: 'oa$SpecificResource',
        oa$hasSource: 'https://book.example/chapter/1',
        oa$hasSelector: {
          id: `${resourceUrl}#note-1-selector`,
          rdf$type: 'oa$FragmentSelector',
          rdf$value: 'p-chapter-boundaries',
        },
      },
    }],
  };
}

function turtleFixture({ text }) {
  const escapedFragment = JSON.stringify(JSON.stringify({ text, annotations: [] }));

  return `
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix oa: <http://www.w3.org/ns/oa#>.
@prefix schema: <https://schema.org/>.
@prefix cobalt: <https://vocab.muze.nl/cobalt#>.

<#note-1>
  a oa:Annotation;
  schema:about <https://example.test/topic>;
  oa:hasBody <#note-1-body>;
  oa:hasTarget <#note-1-target>.

<#note-1-body>
  a oa:TextualBody, cobalt:Fragment;
  dcterms:format "application/vnd.cobalt.fragment+json";
  rdf:value ${JSON.stringify(text)};
  schema:text ${JSON.stringify(text)};
  schema:comment "keep this body fact";
  cobalt:fragment ${escapedFragment}.

<#note-1-target>
  a oa:SpecificResource;
  oa:hasSource <https://book.example/chapter/1>;
  oa:hasSelector <#note-1-selector>.

<#note-1-selector>
  a oa:FragmentSelector;
  rdf:value "p-chapter-boundaries".
`;
}

function orphanedPartsTurtle() {
  return `
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix oa: <http://www.w3.org/ns/oa#>.
@prefix schema: <https://schema.org/>.
@prefix cobalt: <https://vocab.muze.nl/cobalt#>.

<urn:uuid:3b46ac04-cd34-4e2b-a44c-6f56d08c9df3> a oa:Annotation;
  dcterms:created "2026-07-19T21:20:59.640Z";
  dcterms:modified "2026-07-19T21:20:59.640Z".

<urn:uuid:3b46ac04-cd34-4e2b-a44c-6f56d08c9df3#body> a oa:TextualBody, cobalt:Fragment;
  dcterms:format "application/vnd.cobalt.fragment+json";
  rdf:value "blabla";
  schema:text "blabla";
  cobalt:fragment "{\\"text\\":\\"blabla\\",\\"annotations\\":[]}".

<urn:uuid:3b46ac04-cd34-4e2b-a44c-6f56d08c9df3#target> a oa:SpecificResource.

<urn:uuid:3b46ac04-cd34-4e2b-a44c-6f56d08c9df3#selector-fragment> a oa:FragmentSelector;
  rdf:value "p-01-this-book-does-not-teach-you-how-to".
`;
}
