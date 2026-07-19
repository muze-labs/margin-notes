#!/usr/bin/env node

import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');

const cobaltRichTextNotePath = path.resolve('/home/auke/git/poef/cobalt-note/packages/rich-text-note/dist/index.js');
const cobaltNoteCorePath = path.resolve('/home/auke/git/poef/cobalt-note/packages/note-core/dist/index.js');
const simplyflowDir = path.resolve(rootDir, '../simplyflow/packages');

const simplyflowPackages = new Map([
  ['@muze-labs/simplyflow', path.join(simplyflowDir, 'simplyflow/src')],
  ['@muze-labs/simplyflow-app', path.join(simplyflowDir, 'app/src')],
  ['@muze-labs/simplyflow-bind', path.join(simplyflowDir, 'bind/src')],
  ['@muze-labs/simplyflow-model', path.join(simplyflowDir, 'model/src')],
  ['@muze-labs/simplyflow-state', path.join(simplyflowDir, 'state/src')],
]);

const simplyflowResolver = {
  name: 'simplyflow-workspace-resolver',
  setup(build) {
    build.onResolve({ filter: /^@muze-labs\/simplyflow(?:-[a-z]+)?(?:\/.*)?$/ }, args => {
      for (const [packageName, srcPath] of simplyflowPackages) {
        if (args.path === packageName) {
          return { path: path.join(srcPath, 'index.mjs') };
        }
        if (args.path.startsWith(`${packageName}/`)) {
          const subpath = args.path.slice(packageName.length + 1);
          return { path: path.join(srcPath, `${subpath}.mjs`) };
        }
      }
      return null;
    });
  },
};

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

try {
  // Build the bundle
  await esbuild.build({
    entryPoints: [path.join(srcDir, 'index.js')],
    bundle: true,
    outfile: path.join(distDir, 'index.js'),
    format: 'esm',
    platform: 'browser',
    sourcemap: true,
    minify: false,
    alias: {
      '@cobalt/rich-text-note': cobaltRichTextNotePath,
      '@cobalt/note-core': cobaltNoteCorePath
    },
    plugins: [simplyflowResolver],
    loader: {
      '.css': 'text',
      '.html': 'text'
    },
    define: {
      'process.env.NODE_ENV': '"production"'
    }
  });

  console.log('✓ Build complete');
  console.log('  Output: dist/index.js');
  console.log('  Size:', fs.statSync(path.join(distDir, 'index.js')).size, 'bytes');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
