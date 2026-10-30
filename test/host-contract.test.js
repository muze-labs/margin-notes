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

test('HostContract: accepts an optional host-owned anchor slot', () => {
  const config = {
    anchors: [
      { id: 'p-example-one', element: element(), slot: element(), label: 'One' },
    ],
    container: { element: element() },
  };

  assert.equal(validateHostConfig(config), config);
});

test('HostContract: accepts an optional Solid connection slot', () => {
  const config = validConfig({
    solidConnection: {
      container: { element: element() },
      webId: 'https://pod.example/profile/card#me',
    },
  });

  assert.equal(validateHostConfig(config), config);
});

test('HostContract: accepts supported optional themes', () => {
  for (const theme of ['system', 'light', 'dark']) {
    const config = {
      anchors: [],
      container: { element: element() },
      theme,
    };

    assert.equal(validateHostConfig(config), config);
  }
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

  assert.throws(() => {
    validateHostConfig({
      anchors: [{ id: 'p-example-one', element: element(), slot: {} }],
      container: { element: element() },
    });
  }, /anchor "p-example-one" slot must be an element/);
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

test('HostContract: validates optional Solid connection capability', () => {
  assert.throws(
    () => validateHostConfig(validConfig({
      solidConnection: {},
    })),
    /solidConnection must have a container element/
  );
});

test('HostContract: rejects unsupported optional themes', () => {
  assert.throws(() => {
    validateHostConfig({
      anchors: [],
      container: { element: element() },
      theme: 'contrast',
    });
  }, /theme must be "system", "light", or "dark"/);
});

test('HostContract: derives the default store key from namespace', () => {
  assert.equal(storeKeyFromConfig({}), 'margin-notes-default');
  assert.equal(storeKeyFromConfig({ namespace: 'chapter-1' }), 'margin-notes-chapter-1');
});

test('HostContract: uses the explicit storeKey', () => {
  assert.equal(storeKeyFromConfig({
    namespace: 'chapter-1',
    storeKey: 'new-key',
  }), 'new-key');

  assert.equal(storeKeyFromConfig({
    namespace: 'chapter-1',
  }), 'margin-notes-chapter-1');
});

function element() {
  return { nodeType: 1 };
}

function validConfig(overrides = {}) {
  return {
    anchors: [],
    container: { element: element() },
    ...overrides,
  };
}
