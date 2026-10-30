import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSolidNotesConnection, notesResourceUrlForPage } from '../src/storage/solid-notes-location.js';
import oldm from '@muze-nl/oldm';

test('Solid notes location: negotiates Turtle and parses it once through the installed client stack', async (t) => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async request => {
    requests.push(request);
    assert.match(request.headers.get('Accept'), /^text\/turtle(?:,|$)/);
    const url = new URL(request.url);
    url.hash = '';
    const documents = {
      'https://pod.example/profile/card': `
        @prefix space: <http://www.w3.org/ns/pim/space#>.
        @prefix acl: <http://www.w3.org/ns/auth/acl#>.
        @prefix n1: <http://>.
        @prefix n2: <https://>.
        <#me> acl:trustedApp [ acl:origin n1:localhost ], [ acl:origin n2:localhost ];
          space:storage <https://pod.example/storage/>;
          space:preferencesFile <https://pod.example/settings/prefs.ttl>.
      `,
      'https://pod.example/settings/prefs.ttl': `
        @prefix notes: <https://vocab.muze.nl/margin-notes#>.
        <#margin-notes> notes:rootFolder <https://pod.example/private/notes/>.
      `,
    };
    assert.ok(documents[url.href], `Unexpected request: ${request.url}`);
    return new Response(documents[url.href], { headers: { 'Content-Type': 'text/turtle' } });
  });

  const connection = await createSolidNotesConnection({
    webId: 'https://pod.example/profile/card#me',
    pageUrl: 'https://book.example/chapter',
    usePopupAuth: false,
  });

  assert.equal(requests.length, 2);
  assert.equal(requests[0].headers.get('Accept'), 'text/turtle');
  assert.equal(connection.storageUrl, 'https://pod.example/storage/');
  assert.equal(connection.preferencesUrl, 'https://pod.example/settings/prefs.ttl');
  assert.equal(connection.rootFolderUrl, 'https://pod.example/private/notes/');
  assert.match(connection.resourceUrl, /^https:\/\/pod\.example\/private\/notes\/page-[a-f0-9]+\.ttl$/);
});

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

test('Solid notes location: accepts a popup auth callback URL option', async () => {
  const calls = [];
  const solid = solidDouble({
    calls,
    profile: {
      storage: ['https://pod.example/storage/'],
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

  const connection = await createSolidNotesConnection({
    webId: 'https://pod.example/profile/card#me',
    pageUrl: 'https://book.example/chapters/one.html',
    callbackUrl: 'https://book.example/assets/margin-notes-oauth-callback.html',
    solid,
  });

  assert.equal(connection.pageUrl, 'https://book.example/chapters/one.html');
  assert.equal(connection.preferencesUrlSource, 'profile');
});

test('Solid notes location: accepts an authorize callback option', async () => {
  const calls = [];
  let authorizedUrl = '';
  const solid = solidDouble({
    calls,
    profile: {
      storage: ['https://pod.example/storage/'],
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

  const connection = await createSolidNotesConnection({
    webId: 'https://pod.example/profile/card#me',
    pageUrl: 'https://book.example/chapters/one.html',
    authorize_callback(url) {
      authorizedUrl = String(url);
      return 'mockAuthorizationCode';
    },
    solid,
  });

  assert.equal(authorizedUrl, '');
  assert.equal(connection.preferencesUrlSource, 'profile');
});

function solidDouble({ calls, profile, preferencesResponse, headResponse }) {
  return {
    async discoverWebId(webId) {
      calls.push({ method: 'discoverWebId', webId });
      const graph = oldm.context().parse('', webId, 'text/turtle');
      const node = graph.ensureSubject(webId);
      for (const [predicate, value] of Object.entries(profile.profile)) {
        graph.set(node, predicate, value);
      }
      return { ...profile, profile: node };
    },
    async get(url, options) {
      calls.push({ method: 'get', url, options });
      return solidGetResult({ response: preferencesResponse, url });
    },
    async head(url, options) {
      calls.push({ method: 'head', url, options });
      return headResponse || new Response('', { status: 200 });
    },
    async put(url, options) {
      calls.push({ method: 'put', url, body: options?.body, options });
      return new Response('', { status: 201 });
    },
    async patch(url, options) {
      calls.push({ method: 'patch', url, body: options?.body, options });
      return new Response('', { status: 205 });
    },
    async createContainer(url, options) {
      calls.push({ method: 'createContainer', url, options });
      return new Response('', { status: 201 });
    },
  };
}

async function solidGetResult({ response, url }) {
  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`, {
      cause: response,
    });
  }

  if (/^text\/turtle\b/.test(response.headers.get('Content-Type'))) {
    return oldm.context().parse(await response.text(), url, response.headers.get('Content-Type'));
  }

  return response;
}
