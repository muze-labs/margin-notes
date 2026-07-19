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
      await waitFor(() => app.data.marginNotes.anchors.length === 2);

      app.api.notes.CobaltEditorModal = class TestEditorModal {
        async show() {
          return { text: globalThis.__nextNoteText, annotations: [] };
        }
      };
      globalThis.__nextNoteText = 'A browser-created note';
      await app.actions.createNote({ anchorId: 'p-browser-one' });
      await waitFor(() => app.getNotesForAnchor('p-browser-one').length === 1);

      const [created] = app.getNotesForAnchor('p-browser-one');
      const storedAfterCreate = await app.marginNotesRuntime.store.load({ key: storeKey });
      storedAfterCreate.subjects[0].schema$about = 'https://example.test/topic';
      storedAfterCreate.subjects[0].oa$hasBody.schema$comment = 'keep this body fact';
      await app.marginNotesRuntime.store.save({ key: storeKey, value: storedAfterCreate });
      await app.destroy();

      resetPage();

      const restoredApp = MarginNotesAPI.mount({
        anchors: anchorsFromPage(),
        container: { element: document.getElementById('margin-notes-container') },
        storeKey,
      });
      await waitFor(() => restoredApp.getNotesForAnchor('p-browser-one').length === 1);

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
      });

      const [edited] = restoredApp.getNotesForAnchor('p-browser-one');
      const storedAfterEdit = await restoredApp.marginNotesRuntime.store.load({ key: storeKey });
      await restoredApp.actions.deleteNote({ noteId: restored.id });
      await waitFor(() => restoredApp.getNotesForAnchor('p-browser-one').length === 0);

      const storedAfterDelete = await restoredApp.marginNotesRuntime.store.load({ key: storeKey });
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

      async function waitFor(predicate) {
        for (let attempt = 0; attempt < 80; attempt += 1) {
          if (predicate()) return;
          await new Promise(resolve => setTimeout(resolve, 25));
        }
        throw new Error('Timed out waiting for browser condition');
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

async function startServer() {
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === '/test.html') {
      response.writeHead(200, { 'Content-Type': 'text/html' });
      response.end(`<!doctype html>
        <meta charset="utf-8">
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
        throw new Error(result.exceptionDetails.text);
      }
      return result.result.value;
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
