import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as http from 'node:http';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('BrowserMounted: public API creates, restores, edits, and deletes one local note', async () => {
  const server = await startServer();
  const chrome = await startChrome(`${server.url}/test.html`);
  let page;

  try {
    page = await chrome.page();
    await page.ready();

    const result = await page.evaluate(async () => {
      const { MarginNotesAPI } = await import(`/dist/index.js?test=${Date.now()}`);
      const storeKey = `browser-mounted-${crypto.randomUUID()}`;
      const anchors = anchorsFromPage();
      const container = document.getElementById('margin-notes-container');

      const app = MarginNotesAPI.mount({
        anchors,
        container: { element: container },
        storeKey,
      });
      await waitFor(() => app.data.marginNotes.anchors.length === 2, 'initial anchors');

      app.api.notes.CobaltEditorModal = class TestEditorModal {
        async show() {
          return { text: globalThis.__nextNoteText, annotations: [] };
        }
      };
      globalThis.__nextNoteText = 'A browser-created note';
      await app.actions.createNote({ anchorId: 'p-browser-one' });
      await waitFor(() => app.getNotesForAnchor('p-browser-one').length === 1, 'created note');

      const [created] = app.getNotesForAnchor('p-browser-one');
      const createdAnnotation = app.data.marginNotes.graph[0];
      createdAnnotation.schema$about = 'https://example.test/topic';
      createdAnnotation.oa$hasBody.schema$comment = 'keep this body fact';
      await app.actions.saveNotes({});
      const storedAfterCreate = app.api.notes.toStorageDocument({
        subjects: app.marginNotesRuntime.notesService.data.notes.list(),
      });
      await app.destroy();

      resetPage();

      const restoredApp = MarginNotesAPI.mount({
        anchors: anchorsFromPage(),
        container: { element: document.getElementById('margin-notes-container') },
        storeKey,
      });
      await waitFor(() => restoredApp.getNotesForAnchor('p-browser-one').length === 1, 'restored note');

      const [restored] = restoredApp.getNotesForAnchor('p-browser-one');
      restoredApp.api.notes.CobaltEditorModal = class TestEditorModal {
        async show() {
          return { text: globalThis.__nextNoteText, annotations: [] };
        }
      };
      globalThis.__nextNoteText = 'An edited browser note';
      await restoredApp.actions.updateNote({ noteId: restored.id });
      await waitFor(() => {
        return restoredApp.getNotesForAnchor('p-browser-one')[0]?.oa$hasBody.rdf$value === 'An edited browser note';
      }, 'edited note');

      const [edited] = restoredApp.getNotesForAnchor('p-browser-one');
      const storedAfterEdit = restoredApp.api.notes.toStorageDocument({
        subjects: restoredApp.marginNotesRuntime.notesService.data.notes.list(),
      });
      await restoredApp.actions.deleteNote({ noteId: restored.id });
      await waitFor(() => restoredApp.getNotesForAnchor('p-browser-one').length === 0, 'deleted note');

      const storedAfterDelete = restoredApp.api.notes.toStorageDocument({
        subjects: restoredApp.marginNotesRuntime.notesService.data.notes.list(),
      });
      await restoredApp.destroy();

      return {
        createdId: created.id,
        createdType: created.rdf$type,
        createdText: created.oa$hasBody.rdf$value,
        storedFormat: storedAfterCreate.format,
        storedSubjectCount: storedAfterCreate.subjects.length,
        restoredId: restored.id,
        restoredText: restored.oa$hasBody.rdf$value,
        editedId: edited.id,
        editedText: edited.oa$hasBody.rdf$value,
        editedFragment: edited.oa$hasBody.cobalt$fragment,
        editedUnknownSubjectFact: storedAfterEdit.subjects[0].schema$about,
        editedUnknownBodyFact: storedAfterEdit.subjects[0].oa$hasBody.schema$comment,
        storedAfterDeleteCount: storedAfterDelete.subjects.length,
      };

      function anchorsFromPage() {
        return Array.from(document.querySelectorAll('[data-note-target]'), element => ({
          id: element.id,
          element,
          label: element.textContent,
        }));
      }

      function resetPage() {
        document.body.innerHTML = `
          <main>
            <p id="p-browser-one" data-note-target>One</p>
            <p id="p-browser-two" data-note-target>Two</p>
          </main>
          <aside id="margin-notes-container"></aside>
        `;
      }

      async function waitFor(predicate, label = 'browser condition') {
        for (let attempt = 0; attempt < 80; attempt += 1) {
          if (predicate()) return;
          await new Promise(resolve => setTimeout(resolve, 25));
        }
        throw new Error(`Timed out waiting for ${label}`);
      }
    });

    assert.equal(result.createdType, 'oa$Annotation');
    assert.equal(result.createdText, 'A browser-created note');
    assert.equal(result.storedFormat, 'margin-notes-oldmed-graph');
    assert.equal(result.storedSubjectCount, 1);
    assert.equal(result.restoredId, result.createdId);
    assert.equal(result.restoredText, 'A browser-created note');
    assert.equal(result.editedId, result.createdId);
    assert.equal(result.editedText, 'An edited browser note');
    assert.deepEqual(result.editedFragment, {
      text: 'An edited browser note',
      annotations: [],
    });
    assert.equal(result.editedUnknownSubjectFact, 'https://example.test/topic');
    assert.equal(result.editedUnknownBodyFact, 'keep this body fact');
    assert.equal(result.storedAfterDeleteCount, 0);
  } finally {
    page?.close();
    await chrome.close();
    await server.close();
  }
});

test('BrowserMounted: public API can persist through a Solid resource store adapter', async () => {
  const server = await startServer();
  const chrome = await startChrome(`${server.url}/test.html`);
  let page;

  try {
    page = await chrome.page();
    await page.ready();

    const result = await page.evaluate(async () => {
      const { MarginNotesAPI } = await import(`/dist/index.js?test=${Date.now()}`);
      const resourceUrl = 'https://pod.example/private/programming-for-wizards/notes.ttl';
      let resourceBody = '';
      const resourceCalls = [];
      const solid = {
        async get(url, options) {
          resourceCalls.push({ url, method: 'get', options });
          if (!resourceBody) {
            return new Response('', { status: 404, statusText: 'Not Found' });
          }
          return new Response(resourceBody, {
            status: 200,
            headers: { 'Content-Type': 'text/turtle' },
          });
        },
        async put(url, options) {
          const body = options?.body;
          resourceBody = typeof body?.write === 'function' ? await body.write() : String(body);
          resourceCalls.push({ url, method: 'put', options, body: resourceBody });
          return new Response('', { status: 201, statusText: 'Created' });
        },
        async delete(url, options) {
          resourceCalls.push({ url, method: 'delete', options });
          return new Response('', { status: 205, statusText: 'Reset Content' });
        },
      };
      const store = MarginNotesAPI.createSolidResourceStore({
        resourceUrl,
        solid,
      });

      const app = MarginNotesAPI.mount({
        anchors: anchorsFromPage(),
        container: { element: document.getElementById('margin-notes-container') },
        store,
        storeKey: resourceUrl,
      });
      await waitFor(() => app.data.marginNotes.anchors.length === 2);

      app.api.notes.CobaltEditorModal = class TestEditorModal {
        async show() {
          return { text: globalThis.__nextNoteText, annotations: [] };
        }
      };
      globalThis.__nextNoteText = 'A Solid-backed browser note';
      await app.actions.createNote({ anchorId: 'p-browser-one' });
      await waitFor(() => resourceBody.includes('A Solid-backed browser note'));
      const [created] = app.getNotesForAnchor('p-browser-one');
      await app.destroy();

      resetPage();

      const restoredApp = MarginNotesAPI.mount({
        anchors: anchorsFromPage(),
        container: { element: document.getElementById('margin-notes-container') },
        store: MarginNotesAPI.createSolidResourceStore({ resourceUrl, solid }),
        storeKey: resourceUrl,
      });
      await waitFor(() => restoredApp.getNotesForAnchor('p-browser-one').length === 1);
      const [restored] = restoredApp.getNotesForAnchor('p-browser-one');
      await restoredApp.destroy();

      return {
        createdId: created.id,
        restoredId: restored.id,
        restoredText: restored.oa$hasBody.rdf$value,
        requestMethods: resourceCalls.map(call => call.method),
        putBody: resourceCalls.find(call => call.method === 'put')?.body,
        getAccept: resourceCalls.find(call => call.method === 'get')?.options?.headers?.Accept,
      };

      function anchorsFromPage() {
        return Array.from(document.querySelectorAll('[data-note-target]'), element => ({
          id: element.id,
          element,
          label: element.textContent,
        }));
      }

      function resetPage() {
        document.body.innerHTML = `
          <main>
            <p id="p-browser-one" data-note-target>One</p>
            <p id="p-browser-two" data-note-target>Two</p>
          </main>
          <aside id="margin-notes-container"></aside>
        `;
      }

      async function waitFor(predicate) {
        for (let attempt = 0; attempt < 160; attempt += 1) {
          if (predicate()) return;
          await new Promise(resolve => setTimeout(resolve, 25));
        }
        throw new Error('Timed out waiting for browser condition');
      }
    });

    assert.equal(result.restoredId, result.createdId);
    assert.equal(result.restoredText, 'A Solid-backed browser note');
    assert.deepEqual(result.requestMethods, ['get', 'put', 'get']);
    assert.equal(result.getAccept, 'text/turtle, application/ld+json;q=0.9, application/json;q=0.2');
    assert.match(result.putBody, /oa:Annotation/);
    assert.match(result.putBody, /cobalt:fragment/);
  } finally {
    page?.close();
    await chrome.close();
    await server.close();
  }
});

test('BrowserMounted: optional Solid connection slot resolves WebID storage and reloads notes', async () => {
  const server = await startServer();
  const chrome = await startChrome(`${server.url}/test.html`);
  let page;

  try {
    page = await chrome.page();
    await page.ready();

    const result = await page.evaluate(async () => {
      const { MarginNotesAPI } = await import(`/dist/index.js?test=${Date.now()}`);
      const slot = document.createElement('aside');
      slot.id = 'solid-connection-slot';
      document.body.append(slot);

      const calls = [];
      let savedNotesDocument = null;
      const solid = {
        async discoverWebId(webId) {
          calls.push({ method: 'discoverWebId', webId });
          return {
            storage: ['https://pod.example/storage/'],
            issuer: 'https://issuer.example/',
            profile: {
              pim$preferencesFile: { id: 'https://pod.example/settings/prefs.ttl' },
              solid$oidcIssuer: { id: 'https://issuer.example/' },
            },
          };
        },
        async get(url, options) {
          calls.push({ method: 'get', url, options });
          if (url === 'https://pod.example/settings/prefs.ttl') {
            return {
              subjects: [{
                id: 'https://pod.example/settings/prefs.ttl#margin-notes',
                mn$rootFolder: { id: 'https://pod.example/private/margin-notes/' },
              }],
            };
          }

          if (savedNotesDocument) {
            return savedNotesDocument;
          }

          return notesDocument([annotation({
              id: `${url}#note-1`,
              anchorId: 'p-browser-one',
              text: 'Loaded after WebID connection',
            })]);
        },
        async put(url, options) {
          savedNotesDocument = options?.body;
          calls.push({ method: 'put', url });
          return new Response('', {
            status: 201,
            headers: { 'Content-Type': options?.headers?.['Content-Type'] || 'text/turtle' },
          });
        },
        async delete(url) {
          calls.push({ method: 'delete', url });
          return new Response('', { status: 205 });
        },
      };

      const app = MarginNotesAPI.mount({
        anchors: anchorsFromPage(),
        container: { element: document.getElementById('margin-notes-container') },
        storeKey: `browser-solid-connection-${crypto.randomUUID()}`,
        solidConnection: {
          container: { element: slot },
          pageUrl: 'https://book.example/chapters/one.html#book-start',
          solid,
        },
      });
      await waitFor(() => slot.querySelector('[data-margin-notes-solid-webid]'), 'solid webid input');

      slot.querySelector('[data-margin-notes-solid-webid]').value = 'https://pod.example/profile/card#me';
      slot.querySelector('[data-margin-notes-solid-connection]').dispatchEvent(new Event('submit', {
        bubbles: true,
        cancelable: true,
      }));

      await waitFor(() => app.getSolidConnection().status === 'connected'
        && app.getNotesForAnchor('p-browser-one').length === 1, 'connected with remote note');
      const status = app.getSolidConnection();
      const statusText = slot.querySelector('[data-margin-notes-solid-status]').textContent;
      const [note] = app.getNotesForAnchor('p-browser-one');
      app.api.notes.CobaltEditorModal = class TestEditorModal {
        async show() {
          return { text: 'Saved before reconnect', annotations: [] };
        }
      };
      await app.actions.createNote({ anchorId: 'p-browser-two' });
      await waitFor(() => Object.values(savedNotesDocument?.subjects ?? {}).some(subject => {
        return String(subject.oa$hasBody?.rdf$value ?? '') === 'Saved before reconnect'
          || String(subject.rdf$value ?? '') === 'Saved before reconnect';
      }), 'saved new note document');
      await app.destroy();

      resetPage();
      const restoredSlot = document.getElementById('solid-connection-slot');
      const restoredApp = MarginNotesAPI.mount({
        anchors: anchorsFromPage(),
        container: { element: document.getElementById('margin-notes-container') },
        storeKey: `browser-solid-connection-${crypto.randomUUID()}`,
        solidConnection: {
          container: { element: restoredSlot },
          pageUrl: 'https://book.example/chapters/one.html#book-start',
          solid,
        },
      });
      await waitFor(() => restoredApp.getSolidConnection().status === 'connected'
        && restoredApp.getNotesForAnchor('p-browser-two').length === 1, 'restored connected note');
      const restoredStatus = restoredApp.getSolidConnection();
      const [restoredNote] = restoredApp.getNotesForAnchor('p-browser-two');
      await restoredApp.destroy();

      return {
        status,
        statusText,
        noteText: note.oa$hasBody.rdf$value,
        restoredStatus,
        restoredNoteText: restoredNote.oa$hasBody.rdf$value,
        savedNotesText: typeof savedNotesDocument?.write === 'function'
          ? await savedNotesDocument.write()
          : JSON.stringify(savedNotesDocument),
        popupHandleRedirectType: typeof MarginNotesAPI.popupHandleRedirect,
        requestMethods: calls.map(call => call.method),
      };

      function anchorsFromPage() {
        return Array.from(document.querySelectorAll('[data-note-target]'), element => ({
          id: element.id,
          element,
          label: element.textContent,
        }));
      }

      function resetPage() {
        document.body.innerHTML = `
          <main>
            <p id="p-browser-one" data-note-target>One</p>
            <p id="p-browser-two" data-note-target>Two</p>
          </main>
          <aside id="margin-notes-container"></aside>
          <aside id="solid-connection-slot"></aside>
        `;
      }

      function notesDocument(subjects) {
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
          subjects,
        };
      }

      function annotation({ id, anchorId, text }) {
        return {
          id,
          rdf$type: 'oa$Annotation',
          dcterms$created: '2026-07-19T10:00:00.000Z',
          dcterms$modified: '2026-07-19T10:00:00.000Z',
          oa$hasBody: {
            id: `${id}#body`,
            rdf$type: ['oa$TextualBody', 'cobalt$Fragment'],
            dcterms$format: 'application/vnd.cobalt.fragment+json',
            rdf$value: text,
            schema$text: text,
            cobalt$fragment: { text, annotations: [] },
          },
          oa$hasTarget: {
            id: `${id}#target`,
            rdf$type: 'oa$SpecificResource',
            oa$hasSelector: {
              id: `${id}#selector-fragment`,
              rdf$type: 'oa$FragmentSelector',
              rdf$value: anchorId,
            },
          },
        };
      }

      async function waitFor(predicate, label = 'browser condition') {
        for (let attempt = 0; attempt < 80; attempt += 1) {
          if (predicate()) return;
          await new Promise(resolve => setTimeout(resolve, 25));
        }
        throw new Error(`Timed out waiting for ${label}`);
      }
    });

    assert.equal(result.status.status, 'connected');
    assert.equal(result.status.webId, 'https://pod.example/profile/card#me');
    assert.equal(result.status.storageUrl, 'https://pod.example/storage/');
    assert.match(result.status.resourceUrl, /^https:\/\/pod\.example\/private\/margin-notes\/page-[a-f0-9]+\.ttl$/);
    assert.equal(result.statusText, 'Connected to https://pod.example/storage/');
    assert.equal(result.noteText, 'Loaded after WebID connection');
    assert.equal(result.restoredStatus.status, 'connected');
    assert.equal(result.restoredStatus.webId, 'https://pod.example/profile/card#me');
    assert.equal(result.restoredNoteText, 'Saved before reconnect');
    assert.match(result.savedNotesText, /Saved before reconnect/);
    assert.equal(result.popupHandleRedirectType, 'function');
    assert.deepEqual(result.requestMethods.filter(method => method !== 'put'), ['discoverWebId', 'get', 'get', 'get', 'get', 'discoverWebId', 'get', 'get', 'get']);
  } finally {
    page?.close();
    await chrome.close();
    await server.close();
  }
});

test('BrowserMounted: connecting to Solid syncs existing local notes into the discovered resource', async () => {
  const server = await startServer();
  const chrome = await startChrome(`${server.url}/test.html`);
  let page;

  try {
    page = await chrome.page();
    await page.ready();

    const result = await page.evaluate(async () => {
      const { MarginNotesAPI } = await import(`/dist/index.js?test=${Date.now()}`);
      const slot = document.createElement('aside');
      document.body.append(slot);

      const calls = [];
      let savedNotesDocument = null;
      const solid = {
        async discoverWebId(webId) {
          calls.push({ method: 'discoverWebId', webId });
          return {
            storage: ['https://pod.example/storage/'],
            issuer: 'https://issuer.example/',
            profile: {
              pim$preferencesFile: { id: 'https://pod.example/settings/prefs.ttl' },
            },
          };
        },
        async get(url, options) {
          calls.push({ method: 'get', url, options });
          if (url === 'https://pod.example/settings/prefs.ttl') {
            return {
              subjects: [{
                id: 'https://pod.example/settings/prefs.ttl#margin-notes',
                mn$rootFolder: { id: 'https://pod.example/private/margin-notes/' },
              }],
            };
          }

          return savedNotesDocument ?? notesDocument([annotation({
              id: `${url}#solid-note`,
              anchorId: 'p-browser-two',
              text: 'Already in Solid',
            })]);
        },
        async put(url, options) {
          savedNotesDocument = options?.body;
          calls.push({ method: 'put', url, options, body: options?.body });
          return new Response('', {
            status: 201,
            headers: { 'Content-Type': options?.headers?.['Content-Type'] || 'text/turtle' },
          });
        },
        async delete(url) {
          calls.push({ method: 'delete', url });
          return new Response('', { status: 205 });
        },
      };

      const app = MarginNotesAPI.mount({
        anchors: anchorsFromPage(),
        container: { element: document.getElementById('margin-notes-container') },
        storeKey: `browser-local-before-solid-${crypto.randomUUID()}`,
        solidConnection: {
          container: { element: slot },
          pageUrl: 'https://book.example/chapters/one.html#book-start',
          solid,
        },
      });
      await waitFor(() => app.data.marginNotes.anchors.length === 2, 'initial anchors');
      await waitFor(() => slot.querySelector('[data-margin-notes-solid-webid]'), 'solid webid input');

      app.api.notes.CobaltEditorModal = class TestEditorModal {
        async show() {
          return { text: 'Local note before Solid', annotations: [] };
        }
      };
      await app.actions.createNote({ anchorId: 'p-browser-one' });
      await waitFor(() => app.getNotesForAnchor('p-browser-one').length === 1, 'local note before solid');

      slot.querySelector('[data-margin-notes-solid-webid]').value = 'https://pod.example/profile/card#me';
      slot.querySelector('[data-margin-notes-solid-connection]').dispatchEvent(new Event('submit', {
        bubbles: true,
        cancelable: true,
      }));
      await waitFor(() => app.getSolidConnection().status === 'connected'
        && app.getNotesForAnchor('p-browser-two').length === 1, 'connected merged notes');
      const status = app.getSolidConnection();
      const localNote = app.getNotesForAnchor('p-browser-one')[0];
      const solidNote = app.getNotesForAnchor('p-browser-two')[0];
      await app.destroy();

      return {
        status,
        localNoteText: localNote.oa$hasBody.rdf$value,
        solidNoteText: solidNote.oa$hasBody.rdf$value,
        savedNotesText: typeof savedNotesDocument?.write === 'function'
          ? await savedNotesDocument.write()
          : JSON.stringify(savedNotesDocument),
        requestMethods: calls.map(call => call.method),
        putUrl: calls.find(call => call.method === 'put')?.url,
      };

      function anchorsFromPage() {
        return Array.from(document.querySelectorAll('[data-note-target]'), element => ({
          id: element.id,
          element,
          label: element.textContent,
        }));
      }

      function notesDocument(subjects) {
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
          subjects,
        };
      }

      function annotation({ id, anchorId, text }) {
        return {
          id,
          rdf$type: 'oa$Annotation',
          dcterms$created: '2026-07-19T10:00:00.000Z',
          dcterms$modified: '2026-07-19T10:00:00.000Z',
          oa$hasBody: {
            id: `${id}#body`,
            rdf$type: ['oa$TextualBody', 'cobalt$Fragment'],
            dcterms$format: 'application/vnd.cobalt.fragment+json',
            rdf$value: text,
            schema$text: text,
            cobalt$fragment: { text, annotations: [] },
          },
          oa$hasTarget: {
            id: `${id}#target`,
            rdf$type: 'oa$SpecificResource',
            oa$hasSelector: {
              id: `${id}#selector-fragment`,
              rdf$type: 'oa$FragmentSelector',
              rdf$value: anchorId,
            },
          },
        };
      }

      async function waitFor(predicate, label = 'browser condition') {
        for (let attempt = 0; attempt < 80; attempt += 1) {
          if (predicate()) return;
          await new Promise(resolve => setTimeout(resolve, 25));
        }
        throw new Error(`Timed out waiting for ${label}`);
      }
    });

    assert.equal(result.status.status, 'connected');
    assert.match(result.status.resourceUrl, /^https:\/\/pod\.example\/private\/margin-notes\/page-[a-f0-9]+\.ttl$/);
    assert.equal(result.localNoteText, 'Local note before Solid');
    assert.equal(result.solidNoteText, 'Already in Solid');
    assert.match(result.savedNotesText, /Local note before Solid/);
    assert.match(result.savedNotesText, /Already in Solid/);
    assert.equal(result.putUrl, result.status.resourceUrl);
    assert.deepEqual(result.requestMethods, ['discoverWebId', 'get', 'get', 'get', 'put']);
  } finally {
    page?.close();
    await chrome.close();
    await server.close();
  }
});

test('BrowserMounted: Solid connection pre-opens the OAuth popup from the submit gesture', async () => {
  const server = await startServer();
  const chrome = await startChrome(`${server.url}/test.html`);
  let page;

  try {
    page = await chrome.page();
    await page.ready();

    const result = await page.evaluate(async () => {
      const { MarginNotesAPI } = await import(`/dist/index.js?test=${Date.now()}`);
      const slot = document.createElement('aside');
      document.body.append(slot);
      const openedPopups = [];
      const originalOpen = window.open;
      window.open = (url, name, features) => {
        const popup = {
          closed: false,
          location: { href: url || 'about:blank' },
          name,
          features,
        };
        openedPopups.push(popup);
        return popup;
      };

      const app = MarginNotesAPI.mount({
        anchors: anchorsFromPage(),
        container: { element: document.getElementById('margin-notes-container') },
        solidConnection: {
          container: { element: slot },
          pageUrl: 'https://book.example/chapters/one.html#book-start',
          callbackUrl: 'https://book.example/assets/margin-notes-oauth-callback.html',
        },
      });
      await waitFor(() => slot.querySelector('[data-margin-notes-solid-webid]'));

      let callbackPopup;
      let callbackUrl;
      app.api.notes.authorizePopup = async (authorizationCodeURL, options) => {
        callbackUrl = authorizationCodeURL;
        callbackPopup = options?.popup;
        if (callbackPopup) {
          callbackPopup.location.href = authorizationCodeURL;
        }
        return 'mockAuthorizationCode';
      };
      app.api.notes.createSolidNotesConnection = async options => {
        await options.authorize_callback('https://issuer.example/authorize?redirect_uri=https%3A%2F%2Fbook.example%2Fassets%2Fmargin-notes-oauth-callback.html&state=mockState');
        const solid = {
          async get() {
            return { status: 404, ok: false, data: null };
          },
          async put() {
            return { status: 201, ok: true };
          },
          async delete() {
            return { status: 205, ok: true };
          },
        };
        return {
          webId: options.webId,
          storageUrl: 'https://pod.example/storage/',
          resourceUrl: 'https://pod.example/private/margin-notes/page-test.ttl',
          preferencesUrl: 'https://pod.example/preferences.ttl',
          rootFolderUrl: 'https://pod.example/private/margin-notes/',
          solid,
        };
      };

      slot.querySelector('[data-margin-notes-solid-webid]').value = 'https://pod.example/profile/card#me';
      slot.querySelector('[data-margin-notes-solid-connection]').dispatchEvent(new Event('submit', {
        bubbles: true,
        cancelable: true,
      }));
      await waitFor(() => app.getSolidConnection().status === 'connected');
      const [popup] = openedPopups;
      const status = app.getSolidConnection();
      await app.destroy();
      window.open = originalOpen;

      return {
        openedCount: openedPopups.length,
        popupName: popup?.name,
        popupFeatures: popup?.features,
        callbackUrl,
        callbackReceivedOpenedPopup: callbackPopup === popup,
        popupHref: popup?.location.href,
        status,
      };

      function anchorsFromPage() {
        return Array.from(document.querySelectorAll('[data-note-target]'), element => ({
          id: element.id,
          element,
          label: element.textContent,
        }));
      }

      async function waitFor(predicate) {
        for (let attempt = 0; attempt < 80; attempt += 1) {
          if (predicate()) return;
          await new Promise(resolve => setTimeout(resolve, 25));
        }
        throw new Error('Timed out waiting for browser condition');
      }
    });

    assert.equal(result.openedCount, 1);
    assert.equal(result.popupName, 'margin-notes-solid-oauth');
    assert.match(result.popupFeatures, /popup/);
    assert.equal(result.callbackReceivedOpenedPopup, true);
    assert.equal(result.popupHref, result.callbackUrl);
    assert.equal(result.status.status, 'connected');
  } finally {
    page?.close();
    await chrome.close();
    await server.close();
  }
});

test('BrowserMounted: host slots receive anchor widgets', async () => {
  const server = await startServer();
  const chrome = await startChrome(`${server.url}/test.html`);
  let page;

  try {
    page = await chrome.page();
    await page.ready();

    const result = await page.evaluate(async () => {
      const { MarginNotesAPI } = await import(`/dist/index.js?test=${Date.now()}`);
      const anchorElement = document.getElementById('p-browser-one');
      const slot = document.createElement('span');
      slot.className = 'host-margin-slot';
      anchorElement.prepend(slot);

      const app = MarginNotesAPI.mount({
        anchors: [{
          id: 'p-browser-one',
          element: anchorElement,
          slot,
          label: anchorElement.textContent,
        }],
        container: { element: document.getElementById('margin-notes-container') },
        storeKey: `browser-slots-${crypto.randomUUID()}`,
      });
      await waitFor(() => slot.querySelector('.margin-notes-anchor-widget-host'));
      const widget = slot.querySelector('.margin-notes-anchor-widget-host');
      const targetContainsWidget = anchorElement.querySelector(':scope > .margin-notes-anchor-widget-host');
      await app.destroy();

      return {
        widgetAnchor: widget?.dataset.marginNotesAnchor,
        targetContainsWidget: Boolean(targetContainsWidget),
      };

      async function waitFor(predicate) {
        for (let attempt = 0; attempt < 80; attempt += 1) {
          if (predicate()) return;
          await new Promise(resolve => setTimeout(resolve, 25));
        }
        throw new Error('Timed out waiting for browser condition');
      }
    });

    assert.equal(result.widgetAnchor, 'p-browser-one');
    assert.equal(result.targetContainsWidget, false);
  } finally {
    page?.close();
    await chrome.close();
    await server.close();
  }
});

test('BrowserMounted: design-system subset styles editor modal and cleans up on destroy', async () => {
  const server = await startServer();
  const chrome = await startChrome(`${server.url}/test.html`);
  let page;

  try {
    page = await chrome.page();
    await page.ready();

    const result = await page.evaluate(async () => {
      const { MarginNotesAPI } = await import(`/dist/index.js?test=${Date.now()}`);
      const app = MarginNotesAPI.mount({
        anchors: anchorsFromPage(),
        container: { element: document.getElementById('margin-notes-container') },
        storeKey: `browser-ds-${crypto.randomUUID()}`,
      });
      await waitFor(() => app.data.marginNotes.anchors.length === 2);

      const styleIds = Array.from(document.querySelectorAll('style[id^="margin-notes"]'), style => style.id);
      const modal = new app.api.notes.CobaltEditorModal({
        title: 'Styled modal',
        initialFragment: { text: '', annotations: [] },
      });
      void modal.show();
      await waitFor(() => document.querySelector('.margin-notes-editor-modal'));

      const dialog = document.querySelector('.margin-notes-editor-modal-dialog');
      const saveButton = document.querySelector('.margin-notes-editor-btn-save');
      const dialogStyle = getComputedStyle(dialog);
      const saveButtonStyle = getComputedStyle(saveButton);
      const styledModal = {
        dialogRadius: dialogStyle.borderRadius,
        saveButtonBackground: saveButtonStyle.backgroundColor,
        saveButtonColor: saveButtonStyle.color,
        saveButtonOutlineColor: saveButtonStyle.outlineColor,
        hasDesignSystemRule: document
          .getElementById('margin-notes-design-system.css')
          ?.textContent.includes('--ds-button-primary-bg-color') || false,
      };

      modal.destroy();
      await app.destroy();

      return {
        styleIds,
        styledModal,
        hasDesignSystemAfterDestroy: Boolean(document.getElementById('margin-notes-design-system.css')),
      };

      function anchorsFromPage() {
        return Array.from(document.querySelectorAll('[data-note-target]'), element => ({
          id: element.id,
          element,
          label: element.textContent,
        }));
      }

      async function waitFor(predicate) {
        for (let attempt = 0; attempt < 80; attempt += 1) {
          if (predicate()) return;
          await new Promise(resolve => setTimeout(resolve, 25));
        }
        throw new Error('Timed out waiting for browser condition');
      }
    });

    assert.deepEqual(result.styleIds, [
      'margin-notes-design-system.css',
      'margin-notes-ui.css',
      'margin-notes-solid-connection.css',
      'margin-notes-cobalt-editor.css',
    ]);
    assert.equal(result.styledModal.hasDesignSystemRule, true);
    assert.equal(result.styledModal.dialogRadius, '8px');
    assert.notEqual(result.styledModal.saveButtonBackground, 'rgba(0, 0, 0, 0)');
    assert.equal(result.styledModal.saveButtonColor, 'rgb(255, 255, 255)');
    assert.equal(result.styledModal.saveButtonOutlineColor, 'rgba(0, 0, 0, 0)');
    assert.equal(result.hasDesignSystemAfterDestroy, false);
  } finally {
    page?.close();
    await chrome.close();
    await server.close();
  }
});

test('BrowserMounted: host can set and update margin notes theme', async () => {
  const server = await startServer();
  const chrome = await startChrome(`${server.url}/test.html`);
  let page;

  try {
    page = await chrome.page();
    await page.ready();

    const result = await page.evaluate(async () => {
      const { MarginNotesAPI } = await import(`/dist/index.js?test=${Date.now()}`);
      document.documentElement.dataset.marginNotesTheme = 'light';

      const app = MarginNotesAPI.mount({
        anchors: anchorsFromPage(),
        container: { element: document.getElementById('margin-notes-container') },
        storeKey: `browser-theme-${crypto.randomUUID()}`,
        theme: 'dark',
      });
      await waitFor(() => app.data.marginNotes.anchors.length === 2);

      const mountedTheme = app.getTheme();
      const mountedAttribute = document.documentElement.dataset.marginNotesTheme;
      const mountedColorScheme = getComputedStyle(document.getElementById('p-browser-one')).colorScheme;
      const runtimeLight = await app.setTheme('light');
      const lightAttribute = document.documentElement.dataset.marginNotesTheme;
      const runtimeSystem = await app.setTheme('system');
      const systemAttribute = document.documentElement.dataset.marginNotesTheme;
      const invalidMessage = await app.setTheme('contrast').then(
        () => '',
        error => error.message
      );
      await app.setTheme('dark');
      const modal = new app.api.notes.CobaltEditorModal({
        title: 'Themed modal',
        initialFragment: { text: '', annotations: [] },
      });
      void modal.show();
      await waitFor(() => document.querySelector('.margin-notes-editor-modal'));
      const editorStyle = getComputedStyle(document.querySelector('.margin-notes-cobalt-editor'));
      const darkEditorBackground = editorStyle.backgroundColor;
      const darkEditorColorScheme = editorStyle.colorScheme;
      modal.destroy();

      await app.destroy();

      return {
        mountedTheme,
        mountedAttribute,
        mountedColorScheme,
        runtimeLight,
        lightAttribute,
        runtimeSystem,
        systemAttribute,
        invalidMessage,
        darkEditorBackground,
        darkEditorColorScheme,
        restoredAttribute: document.documentElement.dataset.marginNotesTheme,
      };

      function anchorsFromPage() {
        return Array.from(document.querySelectorAll('[data-note-target]'), element => ({
          id: element.id,
          element,
          label: element.textContent,
        }));
      }

      async function waitFor(predicate) {
        for (let attempt = 0; attempt < 80; attempt += 1) {
          if (predicate()) return;
          await new Promise(resolve => setTimeout(resolve, 25));
        }
        throw new Error('Timed out waiting for browser condition');
      }
    });

    assert.equal(result.mountedTheme, 'dark');
    assert.equal(result.mountedAttribute, 'dark');
    assert.equal(result.mountedColorScheme, 'dark');
    assert.equal(result.runtimeLight, 'light');
    assert.equal(result.lightAttribute, 'light');
    assert.equal(result.runtimeSystem, 'system');
    assert.equal(result.systemAttribute, 'system');
    assert.match(result.invalidMessage, /Theme must be "system", "light", or "dark"/);
    assert.notEqual(result.darkEditorBackground, 'rgb(255, 255, 255)');
    assert.equal(result.darkEditorColorScheme, 'dark');
    assert.equal(result.restoredAttribute, 'light');
  } finally {
    page?.close();
    await chrome.close();
    await server.close();
  }
});

test('BrowserMounted: editor modal footer cancel and Escape close without saving', async () => {
  const server = await startServer();
  const chrome = await startChrome(`${server.url}/test.html`);
  let page;

  try {
    page = await chrome.page();
    await page.ready();

    await page.evaluate(async () => {
      const { MarginNotesAPI } = await import(`/dist/index.js?test=${Date.now()}`);
      const app = MarginNotesAPI.mount({
        anchors: anchorsFromPage(),
        container: { element: document.getElementById('margin-notes-container') },
        storeKey: `browser-editor-cancel-${crypto.randomUUID()}`,
      });
      await waitFor(() => app.data.marginNotes.anchors.length === 2);
      globalThis.__modalTestApp = app;
      globalThis.__modalTestWaitFor = waitFor;

      function anchorsFromPage() {
        return Array.from(document.querySelectorAll('[data-note-target]'), element => ({
          id: element.id,
          element,
          label: element.textContent,
        }));
      }

      async function waitFor(predicate) {
        for (let attempt = 0; attempt < 80; attempt += 1) {
          if (predicate()) return;
          await new Promise(resolve => setTimeout(resolve, 25));
        }
        throw new Error('Timed out waiting for browser condition');
      }
    });

    await page.evaluate(async () => {
      const footerCancelModal = new globalThis.__modalTestApp.api.notes.CobaltEditorModal({
        title: 'Footer cancel',
        initialFragment: { text: 'unchanged footer', annotations: [] },
      });
      globalThis.__footerCancelResultPromise = footerCancelModal.show();
      await globalThis.__modalTestWaitFor(() => document.querySelector('.margin-notes-editor-modal'));
    });
    await page.click('.margin-notes-editor-btn-cancel');
    const footerCancelResult = await page.evaluate(async () => {
      const result = await globalThis.__footerCancelResultPromise;
      delete globalThis.__footerCancelResultPromise;
      await globalThis.__modalTestWaitFor(() => !document.querySelector('.margin-notes-editor-modal'));
      return result;
    });

    await page.evaluate(async () => {
      const escapeModal = new globalThis.__modalTestApp.api.notes.CobaltEditorModal({
        title: 'Escape cancel',
        initialFragment: { text: 'unchanged escape', annotations: [] },
      });
      globalThis.__escapeResultPromise = escapeModal.show();
      await globalThis.__modalTestWaitFor(() => document.querySelector('.margin-notes-editor-modal'));
      document.querySelector('.margin-notes-cobalt-editor').focus();
    });
    await page.press('Escape');
    const result = await page.evaluate(async () => {
      const escapeResult = await globalThis.__escapeResultPromise;
      delete globalThis.__escapeResultPromise;
      await globalThis.__modalTestWaitFor(() => !document.querySelector('.margin-notes-editor-modal'));

      await globalThis.__modalTestApp.destroy();
      delete globalThis.__modalTestApp;
      delete globalThis.__modalTestWaitFor;

      return {
        escapeResult,
        modalClosed: !document.querySelector('.margin-notes-editor-modal'),
      };
    });

    assert.equal(footerCancelResult, null);
    assert.equal(result.escapeResult, null);
    assert.equal(result.modalClosed, true);
  } finally {
    page?.close();
    await chrome.close();
    await server.close();
  }
});

test('BrowserMounted: keyboard users can create, traverse, and collapse notes', async () => {
  const server = await startServer();
  const chrome = await startChrome(`${server.url}/test.html`);
  let page;

  try {
    page = await chrome.page();
    await page.ready();

    await page.evaluate(async () => {
      const { MarginNotesAPI } = await import(`/dist/index.js?test=${Date.now()}`);
      const app = MarginNotesAPI.mount({
        anchors: anchorsFromPage(),
        container: { element: document.getElementById('margin-notes-container') },
        storeKey: `browser-keyboard-${crypto.randomUUID()}`,
      });
      await waitFor(() => app.data.marginNotes.anchors.length === 2);

      app.api.notes.CobaltEditorModal = class TestEditorModal {
        async show() {
          return { text: globalThis.__nextNoteText, annotations: [] };
        }
      };
      globalThis.__app = app;
      globalThis.__waitFor = waitFor;

      function anchorsFromPage() {
        return Array.from(document.querySelectorAll('[data-note-target]'), element => ({
          id: element.id,
          element,
          label: element.textContent,
        }));
      }

      async function waitFor(predicate) {
        for (let attempt = 0; attempt < 80; attempt += 1) {
          if (predicate()) return;
          await new Promise(resolve => setTimeout(resolve, 25));
        }
        throw new Error('Timed out waiting for browser condition');
      }
    });

    await page.press('Tab');
    assert.deepEqual(await page.evaluate(activeElement), {
      id: 'p-browser-one',
      className: 'margin-notes-target-tabstop',
      text: 'One',
    });

    await page.press('Tab');
    assert.deepEqual(await page.evaluate(activeElement), {
      id: '',
      className: 'margin-notes-target-add-btn',
      text: '+',
    });

    await page.evaluate(() => {
      globalThis.__nextNoteText = 'First keyboard note';
    });
    await page.press('Enter');
    await page.evaluate(() => globalThis.__waitFor(() => globalThis.__app.getNotesForAnchor('p-browser-one').length === 1));

    await page.evaluate(async () => {
      globalThis.__nextNoteText = 'Second keyboard note';
      await globalThis.__app.actions.createNote({ anchorId: 'p-browser-one' });
    });
    await page.evaluate(() => globalThis.__waitFor(() => globalThis.__app.getNotesForAnchor('p-browser-one').length === 2));

    await page.evaluate(() => {
      document.getElementById('p-browser-one').focus();
    });
    await page.press('Tab');
    assert.deepEqual(await page.evaluate(activeElement), {
      id: '',
      className: 'margin-notes-target-add-btn',
      text: '+',
    });

    await page.evaluate(() => {
      document.querySelector('.margin-notes-target-note-toggle')?.focus();
    });
    await page.evaluate(() => globalThis.__waitFor(() => document.activeElement?.textContent.trim() === 'First keyboard note'));
    assert.deepEqual(await page.evaluate(activeElement), {
      id: '',
      className: 'margin-notes-target-note-toggle',
      text: 'First keyboard note',
    });

    await page.press('ArrowDown');
    await page.evaluate(() => globalThis.__waitFor(() => document.activeElement?.textContent.trim() === 'Second keyboard note'));
    assert.deepEqual(await page.evaluate(activeElement), {
      id: '',
      className: 'margin-notes-target-note-toggle',
      text: 'Second keyboard note',
    });

    await page.press('ArrowUp');
    await page.evaluate(() => globalThis.__waitFor(() => document.activeElement?.textContent.trim() === 'First keyboard note'));
    assert.deepEqual(await page.evaluate(activeElement), {
      id: '',
      className: 'margin-notes-target-note-toggle',
      text: 'First keyboard note',
    });

    await page.press('Enter');
    await page.evaluate(() => globalThis.__waitFor(() => document.activeElement.closest('.margin-notes-target-note')?.classList.contains('is-expanded')));
    assert.equal(await page.evaluate(() => {
      return document.activeElement.closest('.margin-notes-target-note')?.classList.contains('is-expanded');
    }), true);

    await page.press('Tab');
    assert.deepEqual(await page.evaluate(activeElement), {
      id: '',
      className: 'margin-notes-target-note-close',
      text: 'x',
    });

    await page.press('Tab');
    assert.deepEqual(await page.evaluate(activeElement), {
      id: '',
      className: 'margin-notes-target-note-action',
      text: 'Edit',
    });

    await page.press('Tab');
    assert.deepEqual(await page.evaluate(activeElement), {
      id: '',
      className: 'margin-notes-target-note-action',
      text: 'Delete',
    });

    await page.evaluate(() => {
      document.querySelector('.margin-notes-target-note-toggle')?.focus();
    });
    await page.press('Enter');
    await page.evaluate(() => globalThis.__waitFor(() => document.querySelector('.margin-notes-target-note.is-expanded')));
    await page.press('Escape');
    await page.evaluate(() => globalThis.__waitFor(() => !document.querySelector('.margin-notes-target-note.is-expanded')));
    assert.equal(await page.evaluate(() => document.activeElement === document.body), true);

    await page.evaluate(async () => {
      await globalThis.__app.destroy();
      delete globalThis.__app;
      delete globalThis.__waitFor;
    });
  } finally {
    page?.close();
    await chrome.close();
    await server.close();
  }
});

test('BrowserMounted: editor modal key events do not bubble to host shortcuts', async () => {
  const server = await startServer();
  const chrome = await startChrome(`${server.url}/test.html`);
  let page;

  try {
    page = await chrome.page();
    await page.ready();

    const result = await page.evaluate(async () => {
      const { MarginNotesAPI } = await import(`/dist/index.js?test=${Date.now()}`);
      const app = MarginNotesAPI.mount({
        anchors: anchorsFromPage(),
        container: { element: document.getElementById('margin-notes-container') },
        storeKey: `browser-editor-keys-${crypto.randomUUID()}`,
      });
      await waitFor(() => app.data.marginNotes.anchors.length === 2);

      let bubbledKeyCount = 0;
      document.addEventListener('keydown', () => {
        bubbledKeyCount += 1;
      });

      const modal = new app.api.notes.CobaltEditorModal({
        title: 'Keyboard boundary',
        initialFragment: { text: '', annotations: [] },
      });
      void modal.show();
      await waitFor(() => document.querySelector('.margin-notes-editor-modal'));

      const editorTarget = document.querySelector('.margin-notes-cobalt-editor');
      editorTarget.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      }));
      editorTarget.dispatchEvent(new KeyboardEvent('keydown', {
        key: ' ',
        bubbles: true,
        cancelable: true,
      }));

      const modalElement = document.querySelector('.margin-notes-editor-modal');
      const scope = modalElement?.dataset.readerKeyScope;
      modal.destroy();
      await app.destroy();

      return {
        bubbledKeyCount,
        scope,
      };

      function anchorsFromPage() {
        return Array.from(document.querySelectorAll('[data-note-target]'), element => ({
          id: element.id,
          element,
          label: element.textContent,
        }));
      }

      async function waitFor(predicate) {
        for (let attempt = 0; attempt < 80; attempt += 1) {
          if (predicate()) return;
          await new Promise(resolve => setTimeout(resolve, 25));
        }
        throw new Error('Timed out waiting for browser condition');
      }
    });

    assert.equal(result.bubbledKeyCount, 0);
    assert.equal(result.scope, 'margin-notes-editor');
  } finally {
    page?.close();
    await chrome.close();
    await server.close();
  }
});

async function startServer() {
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === '/test.html') {
      response.writeHead(200, { 'Content-Type': 'text/html' });
      response.end(`<!doctype html>
        <meta charset="utf-8">
        <style>
          p[data-note-target] { min-height: 96px; }
        </style>
        <main>
          <p id="p-browser-one" data-note-target>One</p>
          <p id="p-browser-two" data-note-target>Two</p>
        </main>
        <aside id="margin-notes-container"></aside>`);
      return;
    }

    const filePath = path.normalize(path.join(rootDir, decodeURIComponent(url.pathname)));
    if (!filePath.startsWith(rootDir)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    try {
      const contents = await fs.readFile(filePath);
      response.writeHead(200, { 'Content-Type': contentType(filePath) });
      response.end(contents);
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  return {
    url: `http://127.0.0.1:${port}`,
    close() {
      return new Promise(resolve => server.close(resolve));
    },
  };
}

async function startChrome(url) {
  const debugPort = await freePort();
  const userDataDir = path.join('/tmp', `margin-notes-chrome-${process.pid}-${Date.now()}`);
  const chrome = spawn('google-chrome', [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    url,
  ], {
    stdio: ['ignore', 'ignore', 'ignore'],
  });

  let closed = false;
  chrome.once('exit', () => {
    closed = true;
  });

  await waitForEndpoint({ debugPort, isClosed: () => closed });

  return {
    async page() {
      const targets = await fetchJson(`http://127.0.0.1:${debugPort}/json/list`);
      const target = targets.find(item => item.type === 'page');
      if (!target?.webSocketDebuggerUrl) {
        throw new Error('No Chrome page target found');
      }
      return connectPage(target.webSocketDebuggerUrl);
    },

    async close() {
      if (!closed) {
        chrome.kill('SIGTERM');
        await waitForExit({ process: chrome, isClosed: () => closed });
      }
      await fs.rm(userDataDir, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
    },
  };
}

async function connectPage(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  const events = new Map();
  let id = 0;

  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolve(message.result);
      }
      return;
    }

    const listeners = events.get(message.method) || [];
    listeners.forEach(listener => listener(message.params));
  });

  const page = {
    send(method, params = {}) {
      id += 1;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
      });
    },

    once(method) {
      return new Promise(resolve => {
        const listener = params => {
          events.set(method, (events.get(method) || []).filter(item => item !== listener));
          resolve(params);
        };
        events.set(method, [...(events.get(method) || []), listener]);
      });
    },

    async ready() {
      await this.send('Runtime.enable');
      await this.send('Page.enable');
      const state = await this.evaluate(() => document.readyState);
      if (state !== 'complete') {
        await this.once('Page.loadEventFired');
      }
    },

    async evaluate(fn) {
      const result = await this.send('Runtime.evaluate', {
        expression: `(${fn})()`,
        awaitPromise: true,
        returnByValue: true,
      });
      if (result.exceptionDetails) {
        throw new Error(formatBrowserException(result.exceptionDetails));
      }
      return result.result.value;
    },

    async press(key) {
      const definition = keyDefinition(key);
      await this.send('Input.dispatchKeyEvent', {
        type: 'rawKeyDown',
        ...definition,
      });
      if (definition.text) {
        await this.send('Input.dispatchKeyEvent', {
          type: 'char',
          ...definition,
        });
      }
      await this.send('Input.dispatchKeyEvent', {
        type: 'keyUp',
        ...definition,
      });
    },

    async click(selector) {
      const result = await this.send('Runtime.evaluate', {
        expression: `(() => {
          const element = document.querySelector(${JSON.stringify(selector)});
          if (!element) throw new Error('No element for selector: ${selector}');

          element.scrollIntoView({ block: 'center', inline: 'center' });
          const rect = element.getBoundingClientRect();
          return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          };
        })()`,
        awaitPromise: true,
        returnByValue: true,
      });
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.text);
      }
      const { x, y } = result.result.value;
      await this.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x,
        y,
      });
      await this.send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x,
        y,
        button: 'left',
        buttons: 1,
        clickCount: 1,
      });
      await this.send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x,
        y,
        button: 'left',
        buttons: 0,
        clickCount: 1,
      });
    },

    close() {
      socket.close();
    },
  };

  return page;
}

async function waitForEndpoint({ debugPort, isClosed }) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (isClosed()) {
      throw new Error('Chrome exited before DevTools became available');
    }
    try {
      await fetchJson(`http://127.0.0.1:${debugPort}/json/version`);
      return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  throw new Error('Timed out waiting for Chrome DevTools');
}

async function waitForExit({ process, isClosed }) {
  if (isClosed()) return;

  await new Promise(resolve => {
    const timer = setTimeout(() => {
      process.kill('SIGKILL');
      resolve();
    }, 2000);
    process.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function fetchJson(url) {
  return fetch(url).then(response => {
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    return response.json();
  });
}

async function freePort() {
  const server = http.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}

function contentType(filePath) {
  if (filePath.endsWith('.js')) return 'text/javascript';
  if (filePath.endsWith('.html')) return 'text/html';
  if (filePath.endsWith('.css')) return 'text/css';
  if (filePath.endsWith('.json')) return 'application/json';
  return 'text/plain';
}

function formatBrowserException(details) {
  const description = details.exception?.description || details.text;
  const frames = details.stackTrace?.callFrames || [];
  const stack = frames
    .map(frame => `    at ${frame.functionName || '<anonymous>'} (${frame.url}:${frame.lineNumber + 1}:${frame.columnNumber + 1})`)
    .join('\n');

  return stack ? `${description}\n${stack}` : description;
}

function keyDefinition(key) {
  const definitions = {
    ArrowDown: {
      key: 'ArrowDown',
      code: 'ArrowDown',
      windowsVirtualKeyCode: 40,
      nativeVirtualKeyCode: 40,
    },
    ArrowUp: {
      key: 'ArrowUp',
      code: 'ArrowUp',
      windowsVirtualKeyCode: 38,
      nativeVirtualKeyCode: 38,
    },
    Enter: {
      key: 'Enter',
      code: 'Enter',
      text: '\r',
      unmodifiedText: '\r',
      windowsVirtualKeyCode: 13,
      nativeVirtualKeyCode: 13,
    },
    Escape: {
      key: 'Escape',
      code: 'Escape',
      windowsVirtualKeyCode: 27,
      nativeVirtualKeyCode: 27,
    },
    Tab: {
      key: 'Tab',
      code: 'Tab',
      windowsVirtualKeyCode: 9,
      nativeVirtualKeyCode: 9,
    },
  };

  if (!definitions[key]) {
    throw new Error(`Unsupported test key: ${key}`);
  }
  return definitions[key];
}

function activeElement() {
  const element = document.activeElement;
  const ownText = Array.from(element?.childNodes || [])
    .filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => node.textContent)
    .join('')
    .trim();

  return {
    id: element?.id || '',
    className: Array.from(element?.classList || []).sort().join(' '),
    text: ownText || element?.textContent.trim() || '',
  };
}
