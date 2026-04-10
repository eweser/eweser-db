#!/usr/bin/env node
/**
 * Post-build script to add .js extensions to relative imports in compiled ESM dist files.
 * Required because TypeScript with moduleResolution:node doesn't add .js extensions,
 * but Node.js ESM requires explicit extensions.
 *
 * Usage: node scripts/fix-esm-extensions.mjs <dist-dir>
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const distDir = process.argv[2];
if (!distDir) {
  console.error('Usage: node fix-esm-extensions.mjs <dist-dir>');
  process.exit(1);
}

function processFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  // Match: from './xxx' or from '../xxx' where xxx has no extension
  const fixed = content.replace(/from '(\.[^'"]+)'/g, (match, importPath) => {
    // Skip if already has an extension
    if (/\.\w+$/.test(importPath)) return match;
    return `from '${importPath}.js'`;
  });
  if (fixed !== content) {
    writeFileSync(filePath, fixed);
    console.log('Fixed extensions in:', filePath);
  }
}

function walkDir(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkDir(full);
    else if (entry.endsWith('.js')) processFile(full);
  }
}

walkDir(distDir);
console.log('ESM extension fix complete for', distDir);
