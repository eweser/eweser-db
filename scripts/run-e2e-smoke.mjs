import { setTimeout as delay } from 'node:timers/promises';
import { spawn } from 'node:child_process';

const baseUrl = 'http://127.0.0.1:38110';
const spec = 'e2e/cypress/tests/basic-returning-user.cy.ts';

function run(command, args, options = {}) {
  return spawn(command, args, {
    detached: true,
    stdio: 'inherit',
    ...options,
  });
}

async function waitForServer(url, timeoutMs = 90_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // keep retrying
    }
    await delay(1_000);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function main() {
  const devServer = run(
    'npm',
    [
      '--workspace',
      '@eweser/example-basic',
      'run',
      'dev',
      '--',
      '--host',
      '127.0.0.1',
      '--port',
      '38110',
    ],
    {
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '',
      },
    }
  );

  const stopDevServer = async () => {
    if (devServer.killed || devServer.exitCode !== null) return;
    try {
      process.kill(-devServer.pid, 'SIGTERM');
    } catch {
      devServer.kill('SIGTERM');
    }
    await delay(500);
  };

  process.on('SIGINT', () => {
    void stopDevServer();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    void stopDevServer();
    process.exit(143);
  });

  try {
    await waitForServer(baseUrl);
    const cypress = run(
      'npx',
      [
        'cypress',
        'run',
        '--config',
        'video=false',
        '--spec',
        spec,
      ],
      {
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: '',
          CYPRESS_BASE_URL: baseUrl,
        },
      }
    );

    const code = await new Promise((resolve) => {
      cypress.on('exit', (exitCode) => resolve(exitCode ?? 1));
    });

    if (code !== 0) {
      process.exit(code);
    }
  } finally {
    await stopDevServer();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
