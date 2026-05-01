#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();

const requiredHeadings = [
  '## Plain English',
  '## Owns',
  '## Start Here',
  '## Children',
  '## Key Contracts',
  '## Update Triggers',
  '## Testing',
];

const optionalHeadings = new Set([
  '## Runtime Flow',
  '## Known Sharp Edges',
  '## Links',
]);

const fixedHeaderLabels = [
  'Purpose',
  'Exports',
  'Touches',
  'Read before editing',
];

const ignoredDirectoryNames = new Set([
  '.git',
  '.next',
  '.turbo',
  '.cache',
  '.codex',
  '.agents',
  '.astro',
  '.expo',
  'node_modules',
  'dist',
  'dist.root-owned',
  'coverage',
  'downloads',
  'build',
  'out',
]);

const sourceExtensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
]);

const requiredStaticIndexDirs = [
  '.',
  'docs',
  'scripts',
  'e2e',
  'packages',
  'examples',
];

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function relativePath(absPath) {
  const rel = path.relative(repoRoot, absPath);
  return rel === '' ? '.' : toPosix(rel);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function pathExists(relPath) {
  return fs.existsSync(path.join(repoRoot, relPath));
}

function shouldSkipDir(absPath) {
  return ignoredDirectoryNames.has(path.basename(absPath));
}

function walk(absDir, visitor) {
  if (!fs.existsSync(absDir)) {
    return;
  }

  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const absPath = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      if (!shouldSkipDir(absPath)) {
        walk(absPath, visitor);
      }
    } else if (entry.isFile()) {
      visitor(absPath);
    }
  }
}

function expandWorkspaceGlob(globPattern) {
  if (!globPattern.endsWith('/*')) {
    return [];
  }

  const base = globPattern.slice(0, -2);
  const absBase = path.join(repoRoot, base);
  if (!fs.existsSync(absBase)) {
    return [];
  }

  return fs
    .readdirSync(absBase, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(base, entry.name))
    .filter((relDir) => pathExists(path.join(relDir, 'package.json')));
}

function getWorkspaceDirs() {
  const rootPackage = readJson(path.join(repoRoot, 'package.json'));
  const workspaceConfig = rootPackage.workspaces;
  const workspaceGlobs = Array.isArray(workspaceConfig)
    ? workspaceConfig
    : (workspaceConfig?.packages ?? []);

  const dirs = new Set();
  for (const globPattern of workspaceGlobs) {
    if (
      globPattern.startsWith('packages/') ||
      globPattern.startsWith('examples/')
    ) {
      for (const workspaceDir of expandWorkspaceGlob(globPattern)) {
        dirs.add(workspaceDir);
      }
    }
  }
  return [...dirs].sort();
}

function getRequiredIndexDirs() {
  const dirs = new Set(requiredStaticIndexDirs);
  for (const workspaceDir of getWorkspaceDirs()) {
    dirs.add(workspaceDir);
    const srcDir = path.join(workspaceDir, 'src');
    if (pathExists(srcDir)) {
      dirs.add(srcDir);
    }
  }
  return [...dirs].sort();
}

function discoverIndexFiles() {
  const files = [];
  walk(repoRoot, (absPath) => {
    if (path.basename(absPath) === 'INDEX.md') {
      files.push(absPath);
    }
  });
  return files.sort((a, b) => relativePath(a).localeCompare(relativePath(b)));
}

function validateHeadings(absPath, text, errors) {
  const rel = relativePath(absPath);
  const headings = text
    .split(/\r?\n/)
    .filter((line) => /^#{1,6}\s/.test(line))
    .map((line) => line.trim());

  if (!headings[0]?.startsWith('# ') || headings[0]?.startsWith('## ')) {
    errors.push(`${rel}: first heading must be a single "# <name>" heading`);
  }

  let searchFrom = 0;
  for (const required of requiredHeadings) {
    const foundAt = headings.indexOf(required, searchFrom);
    if (foundAt === -1) {
      errors.push(`${rel}: missing required heading "${required}" in order`);
      continue;
    }
    searchFrom = foundAt + 1;
  }

  const testingAt = headings.indexOf('## Testing');
  for (let i = 0; i < headings.length; i += 1) {
    const heading = headings[i];
    if (!heading.startsWith('## ')) {
      continue;
    }
    if (optionalHeadings.has(heading)) {
      if (testingAt === -1 || i < testingAt) {
        errors.push(
          `${rel}: optional heading "${heading}" can only appear after "## Testing"`
        );
      }
      continue;
    }
    if (requiredHeadings.includes(heading)) {
      continue;
    }
    if (heading === headings[0]) {
      continue;
    }
    errors.push(`${rel}: unsupported level-2 heading "${heading}"`);
  }

  if (testingAt !== -1) {
    for (let i = testingAt + 1; i < headings.length; i += 1) {
      const heading = headings[i];
      if (heading.startsWith('## ') && !optionalHeadings.has(heading)) {
        errors.push(
          `${rel}: only optional headings may appear after "## Testing"`
        );
      }
    }
  }
}

function decodeMarkdownTarget(target) {
  try {
    return decodeURI(target);
  } catch {
    return target;
  }
}

function validateLinks(absPath, text, errors) {
  const rel = relativePath(absPath);
  const dir = path.dirname(absPath);
  const linkRegex = /!?\[[^\]]*]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    const rawTarget = match[1].trim();
    const target = rawTarget.split(/\s+/)[0].replace(/^<|>$/g, '');
    if (
      target === '' ||
      target.startsWith('#') ||
      /^[a-z][a-z0-9+.-]*:/i.test(target)
    ) {
      continue;
    }

    const withoutAnchor = decodeMarkdownTarget(target.split('#')[0]);
    if (withoutAnchor === '') {
      continue;
    }

    const resolved = path.resolve(dir, withoutAnchor);
    if (!resolved.startsWith(repoRoot) || !fs.existsSync(resolved)) {
      errors.push(`${rel}: broken local link "${rawTarget}"`);
    }
  }
}

function validateIndexFiles(errors) {
  const requiredDirs = getRequiredIndexDirs();
  for (const dir of requiredDirs) {
    const relIndex = path.join(dir, 'INDEX.md');
    if (!pathExists(relIndex)) {
      errors.push(`${toPosix(relIndex)}: missing required INDEX.md`);
    }
  }

  for (const absPath of discoverIndexFiles()) {
    const text = fs.readFileSync(absPath, 'utf8');
    validateHeadings(absPath, text, errors);
    validateLinks(absPath, text, errors);
  }
}

function validateSourceHeader(absPath, text, errors) {
  if (!text.includes('Purpose:')) {
    return false;
  }

  const rel = relativePath(absPath);
  const headerMatch =
    text.match(/^#![^\n]*\n\/\*\*[\s\S]*?\*\//) ??
    text.match(/^\/\*\*[\s\S]*?\*\//);
  if (!headerMatch) {
    errors.push(
      `${rel}: source header with Purpose must be the first block comment`
    );
    return true;
  }

  const header = headerMatch[0].replace(/^#![^\n]*\n/, '');
  const lines = header.split(/\r?\n/);
  if (lines.length > 8) {
    errors.push(`${rel}: source header must be under 8 lines`);
  }

  const labelLines = lines
    .map((line) => line.match(/^\s*\*\s+([^:]+):\s+\S/))
    .filter(Boolean)
    .map((match) => match[1]);

  for (let i = 0; i < fixedHeaderLabels.length; i += 1) {
    if (labelLines[i] !== fixedHeaderLabels[i]) {
      errors.push(
        `${rel}: source header labels must be ${fixedHeaderLabels.join(', ')} in order`
      );
      break;
    }
  }

  if (labelLines.length !== fixedHeaderLabels.length) {
    errors.push(
      `${rel}: source header must contain exactly four labeled lines`
    );
  }

  return true;
}

function collectSourceCoverage(errors) {
  const coverage = new Map();
  for (const workspaceDir of getWorkspaceDirs()) {
    const absWorkspace = path.join(repoRoot, workspaceDir);
    const counts = { files: 0, headers: 0 };
    walk(absWorkspace, (absPath) => {
      if (!sourceExtensions.has(path.extname(absPath))) {
        return;
      }
      counts.files += 1;
      const text = fs.readFileSync(absPath, 'utf8');
      if (validateSourceHeader(absPath, text, errors)) {
        counts.headers += 1;
      }
    });
    coverage.set(workspaceDir, counts);
  }
  return coverage;
}

const errors = [];
validateIndexFiles(errors);
const coverage = collectSourceCoverage(errors);

console.log('Code index coverage (advisory source headers):');
for (const [workspaceDir, counts] of coverage) {
  const pct =
    counts.files === 0 ? 0 : Math.round((counts.headers / counts.files) * 100);
  console.log(`- ${workspaceDir}: ${counts.headers}/${counts.files} (${pct}%)`);
}

if (errors.length > 0) {
  console.error('\nCode index check failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('\nCode index check passed.');
