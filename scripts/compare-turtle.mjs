import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Deliberately isolated: never rewrite the normal bundle or installed packages.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const adapterDir = path.resolve(process.argv[2] ?? path.join(root, 'node_modules/@muze-labs/oldm-turtle'));
const adapterPackage = JSON.parse(await readFile(path.join(adapterDir, 'package.json'), 'utf8'));
assert.equal(adapterPackage.name, '@muze-labs/oldm-turtle');
const scratch = await mkdtemp(path.join(os.tmpdir(), 'margin-notes-turtle-'));
console.log(`Isolated experiment: ${scratch}`);
for (const name of ['src', 'test', 'scripts', 'package.json', 'node_modules']) {
  await cp(path.join(root, name), path.join(scratch, name), { recursive: true, dereference: true });
}
await mkdir(path.join(scratch, 'dist'));
const files = (await readdir(path.join(scratch, 'test')))
  .filter(name => name.endsWith('.test.js')).map(name => `test/${name}`);
const results = [];
await cp(adapterDir, path.join(scratch, 'node_modules/@muze-labs/oldm-turtle'), {
  recursive: true, dereference: true,
  filter: source => !['node_modules', '.git'].includes(path.basename(source)),
});
const n3Entry = path.join(scratch, 'scripts/n3-reference.mjs');
await writeFile(n3Entry, `
import * as coreModule from '@muze-nl/oldm-core';
import { n3Parser, n3Writer, n3PatchWriter } from '@muze-nl/oldm-n3';
const { default: createContext, ...core } = coreModule;
export default {
  ...core,
  context({ parser = n3Parser, writer = n3Writer, patchWriter = n3PatchWriter, ...options } = {}) {
    return createContext({ ...options, parser, writer, patchWriter });
  },
};
`);

async function exercise(backend) {
  const entry = backend === 'n3' ? n3Entry : path.join(scratch, 'src/oldm.js');
  const bundle = await build({
    absWorkingDir: scratch,
    entryPoints: ['src/index.js'],
    outfile: 'dist/index.js',
    alias: { '@muze-nl/oldm': entry },
    bundle: true, format: 'esm', platform: 'browser', minify: true,
    loader: { '.css': 'text', '.html': 'text' },
    define: { 'process.env.NODE_ENV': '"production"' },
    metafile: true,
  });
  const hasN3 = Object.keys(bundle.metafile.inputs)
    .some(name => /node_modules\/(n3|@muze-nl\/oldm-n3)\//.test(name));
  assert.equal(hasN3, backend === 'n3', `${backend}: unexpected N3 dependency in browser bundle`);
  const code = await readFile(path.join(scratch, 'dist/index.js'));
  await writeFile(path.join(scratch, `${backend}.min.js`), code);
  await writeFile(path.join(scratch, `${backend}.metafile.json`), JSON.stringify(bundle.metafile, null, 2));
  const run = spawnSync(process.execPath, ['--import', './scripts/oldm-loader.mjs', '--test', ...files], {
    cwd: scratch, env: { ...process.env, MARGIN_NOTES_TEST_OLDM: pathToFileURL(entry).href }, encoding: 'utf8', timeout: 180_000, maxBuffer: 10 * 1024 * 1024,
  });
  const log = (run.stdout ?? '') + (run.stderr ?? '') + (run.error ? String(run.error) : '');
  await writeFile(path.join(scratch, `${backend}.tests.log`), log);
  console.log(log.split('\n').filter(line => /^(# (tests|pass|fail|skipped)|[✖✔ℹ]|not ok)/.test(line)).join('\n'));
  const result = {
    backend, adapterVersion: backend === 'turtle' ? adapterPackage.version : null,
    bytes: code.length, gzip: gzipSync(code).length, brotli: brotliCompressSync(code).length,
    exitCode: run.status, hasN3,
  };
  results.push(result);
  return run.status === 0;
}

await exercise('n3');
await exercise('turtle');
console.table(results);
await writeFile(path.join(scratch, 'results.json'), JSON.stringify(results, null, 2));
console.log(`Bundles, dependency reports and test logs retained in ${scratch}`);
if (results.some(result => result.exitCode !== 0)) process.exitCode = 1;
