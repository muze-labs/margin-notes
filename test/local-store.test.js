import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalStore, createMemoryStore } from '../src/storage/local-store.js';

test('LocalStore: stores opaque values by key', async () => {
  const indexedDB = createIndexedDbDouble();
  const store = createLocalStore({ indexedDB });
  const value = {
    format: 'anything',
    nested: {
      rdf$type: 'oa$Annotation',
    },
  };

  await store.save({ key: 'chapter-1', value });

  assert.deepEqual(await store.load({ key: 'chapter-1' }), value);
  assert.deepEqual(indexedDB.databases.get('margin-notes').stores.get('values').get('chapter-1'), {
    key: 'chapter-1',
    value,
  });
});

test('LocalStore: removes values by key', async () => {
  const store = createLocalStore({ indexedDB: createIndexedDbDouble() });

  await store.save({ key: 'chapter-1', value: { text: 'temporary' } });
  await store.remove({ key: 'chapter-1' });

  assert.equal(await store.load({ key: 'chapter-1' }), null);
});

test('MemoryStore: provides the same small store contract for tests and host overrides', async () => {
  const store = createMemoryStore();

  await store.save({ key: 'one', value: { arbitrary: true } });

  assert.deepEqual(await store.load({ key: 'one' }), { arbitrary: true });
});

function createIndexedDbDouble() {
  const databases = new Map();

  return {
    databases,

    open(name) {
      const request = createRequest();
      queueMicrotask(() => {
        const existing = databases.get(name);
        const database = existing || createDatabase();

        if (!existing) {
          databases.set(name, database);
          request.result = database;
          request.onupgradeneeded?.({ target: request });
        }

        request.result = database;
        request.onsuccess?.({ target: request });
      });
      return request;
    },
  };
}

function createDatabase() {
  const stores = new Map();

  return {
    stores,
    objectStoreNames: {
      contains(name) {
        return stores.has(name);
      },
    },
    createObjectStore(name) {
      stores.set(name, new Map());
    },
    transaction(name) {
      return {
        objectStore() {
          const records = stores.get(name);
          return {
            get(key) {
              const request = createRequest();
              queueMicrotask(() => {
                request.result = records.get(key);
                request.onsuccess?.({ target: request });
              });
              return request;
            },
            put(record) {
              const request = createRequest();
              queueMicrotask(() => {
                records.set(record.key, record);
                request.result = record.key;
                request.onsuccess?.({ target: request });
              });
              return request;
            },
            delete(key) {
              const request = createRequest();
              queueMicrotask(() => {
                records.delete(key);
                request.result = undefined;
                request.onsuccess?.({ target: request });
              });
              return request;
            },
          };
        },
      };
    },
  };
}

function createRequest() {
  return {
    result: undefined,
    error: null,
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
  };
}
