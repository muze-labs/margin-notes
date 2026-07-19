import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSolidNotesConnection, notesResourceUrlForPage } from '../src/storage/solid-notes-location.js';

test('Solid notes location: writes default root preference and hashes the page URI', async () => {
  const calls = [];
  const solid = solidDouble({
    calls,
    profile: {
      storage: ['https://pod.example/storage/'],
      issuer: 'https://issuer.example/',
      profile: {
        pim$preferencesFile: { id: 'https://pod.example/settings/prefs.ttl' },
        solid$oidcIssuer: { id: 'https://issuer.example/' },
      },
    },
    preferencesResponse: new Response('', { status: 404, statusText: 'Not Found' }),
    headResponse: new Response('', { status: 404, statusText: 'Not Found' }),
  });

  const connection = await createSolidNotesConnection({
    webId: 'https://pod.example/profile/card#me',
    pageUrl: 'https://book.example/chapters/one.html#p1',
    solid,
  });

  assert.equal(connection.webId, 'https://pod.example/profile/card#me');
  assert.equal(connection.storageUrl, 'https://pod.example/storage/');
  assert.equal(connection.preferencesUrl, 'https://pod.example/settings/prefs.ttl');
  assert.equal(connection.rootFolderUrl, 'https://pod.example/storage/margin-notes/');
  assert.match(connection.resourceUrl, /^https:\/\/pod\.example\/storage\/margin-notes\/page-[a-f0-9]+\.ttl$/);
  assert.deepEqual(calls.map(call => call.method), ['discoverWebId', 'get', 'head', 'put', 'createContainer']);
  assert.match(calls.find(call => call.method === 'put')?.body, /mn:rootFolder <https:\/\/pod\.example\/storage\/margin-notes\/>/);
});

test('Solid notes location: reuses an existing margin-notes root preference', async () => {
  const calls = [];
  const solid = solidDouble({
    calls,
    profile: {
      storage: ['https://pod.example/storage/'],
      issuer: 'https://issuer.example/',
      profile: {
        pim$preferencesFile: { id: 'https://pod.example/settings/prefs.ttl' },
      },
    },
    preferencesResponse: new Response(`
      @prefix mn: <https://vocab.muze.nl/margin-notes#>.

      <#margin-notes> a mn:Preferences;
        mn:rootFolder <https://pod.example/private/book-notes/>.
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/turtle' },
    }),
  });

  const first = await notesResourceUrlForPage({
    rootFolderUrl: 'https://pod.example/private/book-notes/',
    pageUrl: 'https://book.example/chapters/one.html#p1',
  });
  const second = await notesResourceUrlForPage({
    rootFolderUrl: 'https://pod.example/private/book-notes/',
    pageUrl: 'https://book.example/chapters/one.html#p2',
  });
  const connection = await createSolidNotesConnection({
    webId: 'https://pod.example/profile/card#me',
    pageUrl: 'https://book.example/chapters/one.html#p1',
    solid,
  });

  assert.equal(first, second);
  assert.equal(connection.rootFolderUrl, 'https://pod.example/private/book-notes/');
  assert.equal(connection.resourceUrl, first);
  assert.deepEqual(calls.map(call => call.method), ['discoverWebId', 'get']);
});

test('Solid notes location: falls back to a fixed preferences file when the profile has none', async () => {
  const calls = [];
  const solid = solidDouble({
    calls,
    profile: {
      storage: ['https://pod.example/storage/'],
      issuer: 'https://issuer.example/',
      profile: {
        solid$oidcIssuer: { id: 'https://issuer.example/' },
      },
    },
    preferencesResponse: new Response('', { status: 404, statusText: 'Not Found' }),
    headResponse: new Response('', { status: 404, statusText: 'Not Found' }),
  });

  const connection = await createSolidNotesConnection({
    webId: 'https://pod.example/profile/card#me',
    pageUrl: 'https://book.example/chapters/one.html',
    solid,
  });

  assert.equal(connection.preferencesUrl, 'https://pod.example/storage/preferences.ttl');
  assert.equal(connection.preferencesUrlSource, 'default');
  assert.deepEqual(calls.map(call => call.method), ['discoverWebId', 'get', 'head', 'put', 'createContainer']);
  assert.match(calls.find(call => call.method === 'put')?.body, /<https:\/\/pod\.example\/storage\/preferences\.ttl#margin-notes> a mn:Preferences/);
  assert.match(calls.find(call => call.method === 'put')?.body, /mn:rootFolder <https:\/\/pod\.example\/storage\/margin-notes\/>/);
});

test('Solid notes location: accepts an explicit preferences URL override', async () => {
  const calls = [];
  const solid = solidDouble({
    calls,
    profile: {
      storage: ['https://pod.example/storage/'],
      profile: {},
    },
    preferencesResponse: new Response('', { status: 404, statusText: 'Not Found' }),
    headResponse: new Response('', { status: 404, statusText: 'Not Found' }),
  });

  const connection = await createSolidNotesConnection({
    webId: 'https://pod.example/profile/card#me',
    pageUrl: 'https://book.example/chapters/one.html',
    preferencesUrl: 'https://pod.example/custom/prefs.ttl',
    solid,
  });

  assert.equal(connection.preferencesUrl, 'https://pod.example/custom/prefs.ttl');
  assert.equal(connection.preferencesUrlSource, 'configured');
});

function solidDouble({ calls, profile, preferencesResponse, headResponse }) {
  return {
    async discoverWebId(webId) {
      calls.push({ method: 'discoverWebId', webId });
      return profile;
    },
    resource(url) {
      return {
        async get(options) {
          calls.push({ method: 'get', url, options });
          return preferencesResponse;
        },
        async head(options) {
          calls.push({ method: 'head', url, options });
          return headResponse || new Response('', { status: 200 });
        },
        async put(body, options) {
          calls.push({ method: 'put', url, body, options });
          return new Response('', { status: 201 });
        },
        async patch(body, options) {
          calls.push({ method: 'patch', url, body, options });
          return new Response('', { status: 205 });
        },
      };
    },
    container(url) {
      return {
        async create(options) {
          calls.push({ method: 'createContainer', url, options });
          return new Response('', { status: 201 });
        },
      };
    },
  };
}
