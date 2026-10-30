import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStore } from '../src/storage/local-store.js';

test('MemoryStore: host storage keeps and removes Turtle by key', async () => {
  const store = createMemoryStore();
  const value = '<urn:note> <https://schema.org/text> "note" .';
  await store.save({ key: 'one', value });
  assert.equal(await store.load({ key: 'one' }), value);
  await store.remove({ key: 'one' });
  assert.equal(await store.load({ key: 'one' }), null);
});
