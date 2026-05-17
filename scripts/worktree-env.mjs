#!/usr/bin/env node
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

function parseArgs(argv) {
  const args = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      args._.push(arg);
      continue;
    }

    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

function hashName(name) {
  let hash = 2166136261;
  for (const char of name) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function makePorts(name) {
  const slot = hashName(name) % 1000;
  const base = 39000 + slot * 10;

  return {
    postgres: base,
    authApi: base + 1,
    syncA: base + 2,
    syncB: base + 3,
    aggregator: base + 4,
    exampleBasic: base + 5,
    authPages: base + 6,
    eweNote: base + 7,
    dozzle: base + 8,
  };
}

function ensureParent(filePath) {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function copyIfMissing(source, destination) {
  if (!existsSync(source) || existsSync(destination)) return;
  ensureParent(destination);
  copyFileSync(source, destination);
}

function hashFile(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function packageManifestsMatch(sharedDir, worktreeDir) {
  const sharedPackage = path.join(sharedDir, 'package.json');
  const worktreePackage = path.join(worktreeDir, 'package.json');
  if (!existsSync(sharedPackage) || !existsSync(worktreePackage)) return false;
  return hashFile(sharedPackage) === hashFile(worktreePackage);
}

function isRemovableNodeModulesStub(nodeModulesPath) {
  if (!existsSync(nodeModulesPath)) return true;
  const entries = readdirSync(nodeModulesPath).filter(
    (entry) => entry !== '.tmp'
  );
  return entries.length === 0;
}

function linkNodeModules(sharedDir, worktreeDir, label) {
  const sharedNodeModules = path.join(sharedDir, 'node_modules');
  const worktreeNodeModules = path.join(worktreeDir, 'node_modules');
  if (!existsSync(sharedNodeModules)) return false;
  if (!packageManifestsMatch(sharedDir, worktreeDir)) return false;

  if (existsSync(worktreeNodeModules)) {
    const current = statSync(worktreeNodeModules);
    if (current.isSymbolicLink()) return false;
    if (!isRemovableNodeModulesStub(worktreeNodeModules)) return false;
    rmSync(worktreeNodeModules, { recursive: true, force: true });
  }

  symlinkSync(sharedNodeModules, worktreeNodeModules, 'dir');
  console.log(`  Linked ${label}/node_modules`);
  return true;
}

function workspacePackageDirs(root) {
  const dirs = [];
  for (const workspaceRoot of ['packages', 'examples']) {
    const absoluteRoot = path.join(root, workspaceRoot);
    if (!existsSync(absoluteRoot)) continue;

    for (const entry of readdirSync(absoluteRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const relativeDir = path.join(workspaceRoot, entry.name);
      if (existsSync(path.join(root, relativeDir, 'package.json'))) {
        dirs.push(relativeDir);
      }
    }
  }
  return dirs.sort();
}

function linkWorkspaceNodeModules(sharedCheckout, worktree) {
  let linkedCount = 0;

  if (linkNodeModules(sharedCheckout, worktree, '.')) {
    linkedCount += 1;
  }

  for (const relativeDir of workspacePackageDirs(worktree)) {
    const sharedDir = path.join(sharedCheckout, relativeDir);
    const worktreeDir = path.join(worktree, relativeDir);
    if (linkNodeModules(sharedDir, worktreeDir, relativeDir)) {
      linkedCount += 1;
    }
  }

  return linkedCount;
}

function upsertEnvFile(filePath, updates, { template } = {}) {
  ensureParent(filePath);

  if (!existsSync(filePath) && template && existsSync(template)) {
    copyFileSync(template, filePath);
  }

  const existing = existsSync(filePath)
    ? readFileSync(filePath, 'utf8')
    : '# Generated local EweserDB worktree environment\n';
  const lines = existing.split(/\r?\n/);
  const seen = new Set();
  const nextLines = [];

  for (const line of lines) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
    if (!match || !(match[1] in updates)) {
      nextLines.push(line);
      continue;
    }

    const key = match[1];
    nextLines.push(`${key}=${updates[key]}`);
    seen.add(key);
  }

  if (nextLines.length > 0 && nextLines.at(-1) !== '') {
    nextLines.push('');
  }

  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) {
      nextLines.push(`${key}=${value}`);
    }
  }

  writeFileSync(filePath, `${nextLines.join('\n').replace(/\n+$/u, '')}\n`);
}

function writeWorktreePorts(filePath, values) {
  const orderedKeys = [
    'EWESER_WORKTREE_NAME',
    'COMPOSE_PROJECT_NAME',
    'POSTGRES_HOST_PORT',
    'SYNC_A_HOST_PORT',
    'SYNC_B_HOST_PORT',
    'AGGREGATOR_HOST_PORT',
    'AUTH_API_HOST_PORT',
    'DOZZLE_PORT',
    'EXAMPLE_BASIC_PORT',
    'AUTH_PAGES_PORT',
    'EWE_NOTE_PORT',
    'AUTH_PUBLIC_URL',
    'AUTH_PUBLIC_DOMAIN',
    'AUTH_TRUSTED_ORIGINS',
    'SYNC_PUBLIC_URL',
    'DATABASE_URL',
    'AUTH_API_URL',
    'VITE_AUTH_SERVER',
    'VITE_AUTH_SERVER_URL',
    'VITE_AUTH_API_URL',
    'VITE_AUTH_PAGES_URL',
    'VITE_SYNC_SERVER',
    'VITE_SYNC_SERVER_A_URL',
    'VITE_SYNC_SERVER_B_URL',
  ];

  const lines = [
    '# EweserDB worktree runtime environment.',
    '# Generated by scripts/worktree-env.mjs. Source this before dev/e2e commands:',
    '#   source .worktree-ports',
    '',
  ];

  for (const key of orderedKeys) {
    lines.push(`export ${key}=${shellQuote(values[key])}`);
  }

  writeFileSync(filePath, `${lines.join('\n')}\n`);
}

function setup({ sharedCheckout, worktree, name }) {
  const worktreeName = name || path.basename(worktree);
  const safeName = slugify(worktreeName) || 'worktree';
  const ports = makePorts(worktreeName);
  const authOrigin = `http://localhost:${ports.authApi}`;
  const authOriginLoopback = `http://127.0.0.1:${ports.authApi}`;
  const syncAUrl = `ws://localhost:${ports.syncA}`;
  const syncBUrl = `ws://localhost:${ports.syncB}`;
  const authPagesUrl = `http://localhost:${ports.authPages}`;
  const trustedOrigins = [
    authOrigin,
    authOriginLoopback,
    `http://localhost:${ports.exampleBasic}`,
    `http://127.0.0.1:${ports.exampleBasic}`,
    authPagesUrl,
    `http://127.0.0.1:${ports.authPages}`,
    `http://localhost:${ports.eweNote}`,
    `http://127.0.0.1:${ports.eweNote}`,
  ].join(',');

  const values = {
    EWESER_WORKTREE_NAME: worktreeName,
    COMPOSE_PROJECT_NAME: `eweser_${safeName}`,
    POSTGRES_HOST_PORT: String(ports.postgres),
    SYNC_A_HOST_PORT: String(ports.syncA),
    SYNC_B_HOST_PORT: String(ports.syncB),
    AGGREGATOR_HOST_PORT: String(ports.aggregator),
    AUTH_API_HOST_PORT: String(ports.authApi),
    DOZZLE_PORT: String(ports.dozzle),
    EXAMPLE_BASIC_PORT: String(ports.exampleBasic),
    AUTH_PAGES_PORT: String(ports.authPages),
    EWE_NOTE_PORT: String(ports.eweNote),
    AUTH_PUBLIC_URL: authOrigin,
    AUTH_PUBLIC_DOMAIN: `localhost:${ports.authApi}`,
    AUTH_TRUSTED_ORIGINS: trustedOrigins,
    SYNC_PUBLIC_URL: syncAUrl,
    DATABASE_URL: `postgresql://eweser:changeme@localhost:${ports.postgres}/eweser`,
    AUTH_API_URL: `${authOriginLoopback}/auth`,
    VITE_AUTH_SERVER: authOrigin,
    VITE_AUTH_SERVER_URL: authOriginLoopback,
    VITE_AUTH_API_URL: `${authOriginLoopback}/auth`,
    VITE_AUTH_PAGES_URL: authPagesUrl,
    VITE_SYNC_SERVER: syncAUrl,
    VITE_SYNC_SERVER_A_URL: syncAUrl,
    VITE_SYNC_SERVER_B_URL: syncBUrl,
  };

  copyIfMissing(path.join(sharedCheckout, '.env'), path.join(worktree, '.env'));
  upsertEnvFile(
    path.join(worktree, '.env'),
    {
      COMPOSE_PROJECT_NAME: values.COMPOSE_PROJECT_NAME,
      POSTGRES_HOST_PORT: values.POSTGRES_HOST_PORT,
      SYNC_A_HOST_PORT: values.SYNC_A_HOST_PORT,
      SYNC_B_HOST_PORT: values.SYNC_B_HOST_PORT,
      AGGREGATOR_HOST_PORT: values.AGGREGATOR_HOST_PORT,
      AUTH_API_HOST_PORT: values.AUTH_API_HOST_PORT,
      AUTH_API_PORT: values.AUTH_API_HOST_PORT,
      DOZZLE_PORT: values.DOZZLE_PORT,
      EXAMPLE_BASIC_PORT: values.EXAMPLE_BASIC_PORT,
      AUTH_PAGES_PORT: values.AUTH_PAGES_PORT,
      EWE_NOTE_PORT: values.EWE_NOTE_PORT,
      AUTH_PUBLIC_URL: values.AUTH_PUBLIC_URL,
      AUTH_PUBLIC_DOMAIN: values.AUTH_PUBLIC_DOMAIN,
      AUTH_TRUSTED_ORIGINS: values.AUTH_TRUSTED_ORIGINS,
      SYNC_PUBLIC_URL: values.SYNC_PUBLIC_URL,
      DATABASE_URL: values.DATABASE_URL,
      VITE_AUTH_SERVER: values.VITE_AUTH_SERVER,
      VITE_AUTH_SERVER_URL: values.VITE_AUTH_SERVER_URL,
      VITE_AUTH_API_URL: values.VITE_AUTH_API_URL,
      VITE_AUTH_PAGES_URL: values.VITE_AUTH_PAGES_URL,
      VITE_SYNC_SERVER: values.VITE_SYNC_SERVER,
      VITE_SYNC_SERVER_A_URL: values.VITE_SYNC_SERVER_A_URL,
      VITE_SYNC_SERVER_B_URL: values.VITE_SYNC_SERVER_B_URL,
    },
    {
      template: path.join(worktree, '.env.example'),
    }
  );

  upsertEnvFile(path.join(worktree, 'examples/example-basic/.env.local'), {
    VITE_AUTH_SERVER: values.VITE_AUTH_SERVER,
    VITE_SYNC_SERVER: values.VITE_SYNC_SERVER,
  });

  upsertEnvFile(path.join(worktree, 'packages/app/.env.local'), {
    VITE_AUTH_SERVER_URL: values.VITE_AUTH_SERVER_URL,
    VITE_AUTH_API_URL: values.VITE_AUTH_API_URL,
  });

  upsertEnvFile(path.join(worktree, 'packages/ewe-note/.env.local'), {
    VITE_AUTH_SERVER: values.VITE_AUTH_SERVER,
    VITE_AUTH_PAGES_URL: values.VITE_AUTH_PAGES_URL,
    VITE_SYNC_SERVER: values.VITE_SYNC_SERVER,
  });

  writeWorktreePorts(path.join(worktree, '.worktree-ports'), values);

  console.log('EweserDB worktree environment ready');
  const linkedCount = linkWorkspaceNodeModules(sharedCheckout, worktree);
  console.log(`  Auth API: ${values.AUTH_PUBLIC_URL}`);
  console.log(`  Auth app: ${values.VITE_AUTH_PAGES_URL}`);
  console.log(`  Example basic: http://localhost:${values.EXAMPLE_BASIC_PORT}`);
  console.log(`  Ewe Note: http://localhost:${values.EWE_NOTE_PORT}`);
  if (linkedCount > 0) {
    console.log(`  Linked ${linkedCount} shared node_modules directorie(s)`);
  }
  console.log('  Load env: source .worktree-ports');
}

const args = parseArgs(process.argv.slice(2));
const command = args._[0] ?? 'setup';

if (command !== 'setup') {
  console.error(
    'usage: node scripts/worktree-env.mjs setup --worktree <path> --shared-checkout <path> [--name <name>]'
  );
  process.exit(1);
}

const worktree = path.resolve(args.worktree ?? process.cwd());
const sharedCheckout = path.resolve(args['shared-checkout'] ?? worktree);

setup({
  sharedCheckout,
  worktree,
  name: args.name,
});
