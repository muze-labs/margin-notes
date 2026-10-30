import { register } from 'node:module';
import { isMainThread } from 'node:worker_threads';

// Match the browser build's application-only module resolution. The override is
// used by compare-turtle.mjs to exercise an independent N3 reference backend.
const backend = process.env.MARGIN_NOTES_TEST_OLDM
  ?? new URL('../src/oldm.js', import.meta.url).href;

if (isMainThread) register(import.meta.url);

export function resolve(specifier, context, nextResolve) {
  if (specifier === '@muze-nl/oldm') {
    return { url: backend, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
