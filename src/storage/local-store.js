const DEFAULT_NAME = 'margin-notes';
const DEFAULT_COLLECTION = 'values';

export function createLocalStore(options = {}) {
  const name = options.name || DEFAULT_NAME;
  const collection = options.collection || DEFAULT_COLLECTION;
  const indexedDB = options.indexedDB ?? globalThis.indexedDB;
  let database;

  return {
    name: 'localStore',

    async load({ key }) {
      const store = await objectStore({ mode: 'readonly' });
      const record = await requestValue(store.get(key));
      return record?.value ?? null;
    },

    async save({ key, value }) {
      const store = await objectStore({ mode: 'readwrite' });
      await requestValue(store.put({ key, value }));
      return { key };
    },

    async remove({ key }) {
      const store = await objectStore({ mode: 'readwrite' });
      await requestValue(store.delete(key));
      return { key };
    },
  };

  async function objectStore({ mode }) {
    database ||= openDatabase({ indexedDB, name, collection });
    const db = await database;
    return db.transaction(collection, mode).objectStore(collection);
  }
}

export function createMemoryStore(records = new Map()) {
  return {
    name: 'memoryStore',

    async load({ key }) {
      return records.get(key) ?? null;
    },

    async save({ key, value }) {
      records.set(key, value);
      return { key };
    },

    async remove({ key }) {
      records.delete(key);
      return { key };
    },
  };
}

function openDatabase({ indexedDB, name, collection }) {
  if (!indexedDB) {
    return Promise.reject(new Error('Browser local storage is not available'));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);

    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(collection)) {
        db.createObjectStore(collection, { keyPath: 'key' });
      }
    };
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = event => reject(event.target.error);
  });
}

function requestValue(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = event => reject(event.target.error);
  });
}
