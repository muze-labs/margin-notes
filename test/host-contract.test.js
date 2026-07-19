import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storeKeyFromConfig, validateHostConfig } from '../src/host-contract.js';

test('HostContract: accepts the minimal valid mount config', () => {
  const config = {
    anchors: [
      { id: 'p-example-one', element: element(), label: 'One' },
      { id: 'p-example-two', element: element(), label: 'Two' },
    ],
    container: { element: element() },
  };

  assert.equal(validateHostConfig(config), config);
});

test('HostContract: rejects a missing config', () => {
  assert.throws(() => validateHostConfig(null), /Config is required/);
});

test('HostContract: requires anchors array', () => {
  assert.throws(() => {
    validateHostConfig({
      container: { element: element() },
    });
  }, /anchors array/);
});

test('HostContract: requires container with element', () => {
  assert.throws(() => {
    validateHostConfig({
      anchors: [],
    });
  }, /container with element/);

  assert.throws(() => {
    validateHostConfig({
      anchors: [],
      container: { element: {} },
    });
  }, /container with element/);
});

test('HostContract: requires each anchor to have a stable id and element', () => {
  assert.throws(() => {
    validateHostConfig({
      anchors: [{ element: element() }],
      container: { element: element() },
    });
  }, /anchor at index 0 must have an id/);

  assert.throws(() => {
    validateHostConfig({
      anchors: [{ id: 'p-example-one' }],
      container: { element: element() },
    });
  }, /anchor "p-example-one" must have an element/);
});

test('HostContract: requires anchor ids to be unique', () => {
  assert.throws(() => {
    validateHostConfig({
      anchors: [
        { id: 'p-example-one', element: element() },
        { id: 'p-example-one', element: element() },
      ],
      container: { element: element() },
    });
  }, /unique ids/);
});

test('HostContract: validates optional store capability', () => {
  assert.doesNotThrow(() => {
    validateHostConfig({
      anchors: [],
      container: { element: element() },
      store: {
        async load() {},
        async save() {},
        async remove() {},
      },
    });
  });

  assert.throws(() => {
    validateHostConfig({
      anchors: [],
      container: { element: element() },
      store: {
        async load() {},
        async save() {},
      },
    });
  }, /store must provide remove/);
});

test('HostContract: derives the default store key from namespace', () => {
  assert.equal(storeKeyFromConfig({}), 'margin-notes-default');
  assert.equal(storeKeyFromConfig({ namespace: 'chapter-1' }), 'margin-notes-chapter-1');
});

test('HostContract: prefers storeKey over the backwards-compatible storageKey alias', () => {
  assert.equal(storeKeyFromConfig({
    namespace: 'chapter-1',
    storageKey: 'old-key',
    storeKey: 'new-key',
  }), 'new-key');

  assert.equal(storeKeyFromConfig({
    namespace: 'chapter-1',
    storageKey: 'old-key',
  }), 'old-key');
});

function element() {
  return { nodeType: 1 };
}
