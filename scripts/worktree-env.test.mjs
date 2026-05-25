import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const repoRoot = path.resolve(import.meta.dirname, '..');
const scriptPath = path.join(repoRoot, 'scripts/worktree-env.mjs');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readEnvValue(filePath, key) {
  const content = readFileSync(filePath, 'utf8');
  const escapedKey = escapeRegExp(key);
  const pattern = new RegExp(
    `^(?:export\\s+)?${escapedKey}=(?:'([^'\\n]*)'|([^\\n]+))$`,
    'm'
  );
  const match = content.match(pattern);
  return match ? (match[1] ?? match[2] ?? null) : null;
}

test('readEnvValue matches exact env keys and strips shell quotes', () => {
  const tmpRoot = mkdtempSync(path.join(tmpdir(), 'eweser-env-read-'));
  const envFile = path.join(tmpRoot, '.env');

  try {
    writeFileSync(
      envFile,
      [
        'AUTH_API_URL_SUFFIX=http://localhost/wrong',
        "export AUTH_API_URL='http://localhost:1234/api/auth'",
        'VITE_AUTH_API_URL=http://localhost:5678/api/auth',
      ].join('\n')
    );

    assert.equal(
      readEnvValue(envFile, 'AUTH_API_URL'),
      'http://localhost:1234/api/auth'
    );
    assert.equal(
      readEnvValue(envFile, 'VITE_AUTH_API_URL'),
      'http://localhost:5678/api/auth'
    );
    assert.equal(readEnvValue(envFile, 'AUTH_API_URL_MISSING'), null);
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('worktree-env points frontend auth API env at the API auth route', () => {
  const tmpRoot = mkdtempSync(path.join(tmpdir(), 'eweser-worktree-env-'));
  const sharedCheckout = path.join(tmpRoot, 'shared');
  const worktree = path.join(tmpRoot, 'worktree');

  try {
    mkdirSync(sharedCheckout, { recursive: true });
    mkdirSync(worktree, { recursive: true });
    writeFileSync(
      path.join(sharedCheckout, 'package.json'),
      '{"name":"shared"}\n'
    );
    writeFileSync(path.join(worktree, 'package.json'), '{"name":"worktree"}\n');

    const result = spawnSync(
      process.execPath,
      [
        scriptPath,
        'setup',
        '--worktree',
        worktree,
        '--shared-checkout',
        sharedCheckout,
        '--name',
        'auth-api-fixture',
      ],
      { encoding: 'utf8' }
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(
      readEnvValue(path.join(worktree, '.worktree-ports'), 'AUTH_API_URL') ??
        '',
      /\/api\/auth$/
    );
    assert.match(
      readEnvValue(
        path.join(worktree, '.worktree-ports'),
        'VITE_AUTH_API_URL'
      ) ?? '',
      /\/api\/auth$/
    );
    assert.match(
      readEnvValue(path.join(worktree, '.env'), 'VITE_AUTH_API_URL') ?? '',
      /\/api\/auth$/
    );
    assert.match(
      readEnvValue(
        path.join(worktree, 'packages/app/.env.local'),
        'VITE_AUTH_API_URL'
      ) ?? '',
      /\/api\/auth$/
    );
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }
});
