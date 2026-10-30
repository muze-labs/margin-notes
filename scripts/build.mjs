#!/usr/bin/env node

import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');

const cobaltRichTextNotePath = path.resolve(rootDir, '../cobalt-note/packages/rich-text-note/dist/index.js');
const cobaltNoteCorePath = path.resolve(rootDir, '../cobalt-note/packages/note-core/dist/index.js');
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
      '@muze-labs/cobalt-rich-text-note': cobaltRichTextNotePath,
      '@muze-labs/cobalt-note-core': cobaltNoteCorePath
    },
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
