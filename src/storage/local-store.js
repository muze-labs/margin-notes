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
