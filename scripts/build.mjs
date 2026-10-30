#!/usr/bin/env node

import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

try {
  // Build the bundle
  const result = await esbuild.build({
    entryPoints: [path.join(srcDir, 'index.js')],
    bundle: true,
    alias: { '@muze-nl/oldm': path.join(srcDir, 'oldm.js') },
    metafile: true,
    outfile: path.join(distDir, 'index.js'),
    format: 'esm',
    platform: 'browser',
    sourcemap: true,
    minify: false,
    loader: {
      '.css': 'text',
      '.html': 'text'
    },
    define: {
      'process.env.NODE_ENV': '"production"'
    }
  });

  if (Object.keys(result.metafile.inputs).some(name => /node_modules\/(n3|@muze-nl\/oldm-n3)\//.test(name))) {
    throw new Error('N3 must not be included in the margin-notes browser bundle');
  }

  console.log('✓ Build complete');
  console.log('  Output: dist/index.js');
  console.log('  Size:', fs.statSync(path.join(distDir, 'index.js')).size, 'bytes');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
