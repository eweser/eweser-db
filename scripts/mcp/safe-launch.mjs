#!/usr/bin/env node

import { spawn } from 'node:child_process';

const BASE_ALLOWED_ENV_KEYS = [
  'PATH',
  'HOME',
  'USER',
  'LOGNAME',
  'SHELL',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'TERM',
  'TMPDIR',
  'TMP',
  'TEMP',
  'XDG_CACHE_HOME',
  'XDG_CONFIG_HOME',
  'XDG_DATA_HOME',
  'SSL_CERT_FILE',
  'SSL_CERT_DIR',
];

function printUsageAndExit(message) {
  if (message) {
    console.error(`[mcp-safe-launch] ${message}`);
  }
  console.error(
    '[mcp-safe-launch] Usage: safe-launch.mjs [--allow KEY]... -- <command> [args...]'
  );
  process.exit(1);
}

const argv = process.argv.slice(2);
const separatorIndex = argv.indexOf('--');
if (separatorIndex === -1) {
  printUsageAndExit('Missing command separator "--".');
}

const optionArgs = argv.slice(0, separatorIndex);
const commandArgs = argv.slice(separatorIndex + 1);

if (commandArgs.length === 0) {
  printUsageAndExit('Missing command after "--".');
}

const allowed = new Set(BASE_ALLOWED_ENV_KEYS);
for (let i = 0; i < optionArgs.length; i += 1) {
  const arg = optionArgs[i];
  if (arg !== '--allow') {
    printUsageAndExit(`Unknown option: ${arg}`);
  }

  const key = optionArgs[i + 1];
  if (!key || key.startsWith('--')) {
    printUsageAndExit('Expected KEY after --allow.');
  }

  allowed.add(key);
  i += 1;
}

const childEnv = {};
for (const key of allowed) {
  if (Object.prototype.hasOwnProperty.call(process.env, key)) {
    childEnv[key] = process.env[key];
  }
}

const [command, ...args] = commandArgs;
const child = spawn(command, args, {
  stdio: 'inherit',
  env: childEnv,
});

child.on('error', (error) => {
  console.error('[mcp-safe-launch] Failed to start command', {
    command,
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
