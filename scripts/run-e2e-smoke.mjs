import { setTimeout as delay } from 'node:timers/promises';
import { spawn } from 'node:child_process';

const exampleBaseUrl = process.env.CYPRESS_BASE_URL ?? 'http://127.0.0.1:38110';
const authPagesBaseUrl =
  process.env.AUTH_PAGES_BASE_URL ?? 'http://127.0.0.1:38111';
const authApiUrl = process.env.AUTH_API_URL ?? 'http://127.0.0.1:38101/auth';
const specs = [
  'e2e/cypress/tests/basic-returning-user.cy.ts',
  'e2e/cypress/tests/auth-security-smoke.cy.ts',
].join(',');

/**
 * @param {string} command
 * @param {string[]} args
 * @param {import('node:child_process').SpawnOptions} [options]
 */
function run(command, args, options = {}) {
  return spawn(command, args, {
    stdio: 'inherit',
    ...options,
  });
}

/**
 * @param {import('node:child_process').ChildProcess} childProcess
 * @param {number} [timeoutMs]
 * @returns {Promise<void>}
 */
function waitForExit(childProcess, timeoutMs = 5_000) {
  return new Promise((resolve) => {
    if (childProcess.exitCode !== null) {
      resolve();
      return;
    }

    const onExit = () => {
      clearTimeout(timer);
      resolve();
    };

    const timer = setTimeout(() => {
      childProcess.off('exit', onExit);
      resolve();
    }, timeoutMs);

    childProcess.once('exit', onExit);
  });
}

/**
 * @param {string} url
 * @param {number} [timeoutMs]
 */
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
  /** @type {import('node:child_process').ChildProcess[]} */
  const childProcesses = [];

  if (!process.env.CYPRESS_BASE_URL) {
    childProcesses.push(
      run(
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
          '--strictPort',
        ],
        {
          env: {
            ...process.env,
            ELECTRON_RUN_AS_NODE: '',
            VITE_AUTH_API_URL: authApiUrl,
            VITE_AUTH_SERVER_URL: 'http://127.0.0.1:38101',
          },
        }
      )
    );
  }

  if (!process.env.AUTH_PAGES_BASE_URL) {
    childProcesses.push(
      run(
        'npm',
        [
          '--workspace',
          '@eweser/app',
          'run',
          'dev',
          '--',
          '--host',
          '127.0.0.1',
          '--port',
          '38111',
          '--strictPort',
        ],
        {
          env: {
            ...process.env,
            ELECTRON_RUN_AS_NODE: '',
          },
        }
      )
    );
  }

  const stopDevServers = async () => {
    await Promise.all(
      childProcesses.map(async (childProcess) => {
        if (childProcess.killed || childProcess.exitCode !== null) return;
        childProcess.kill('SIGTERM');
        await waitForExit(childProcess);
        if (childProcess.exitCode === null) {
          childProcess.kill('SIGKILL');
          await waitForExit(childProcess, 2_000);
        }
      })
    );
  };

  process.on('SIGINT', () => {
    void stopDevServers();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    void stopDevServers();
    process.exit(143);
  });

  try {
    await waitForServer(exampleBaseUrl);
    await waitForServer(`${authPagesBaseUrl}/sign-in`);
    const cypress = run(
      'npx',
      ['cypress', 'run', '--config', 'video=false', '--spec', specs],
      {
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: '',
          AUTH_PAGES_BASE_URL: authPagesBaseUrl,
          AUTH_API_URL: authApiUrl,
          CYPRESS_BASE_URL: exampleBaseUrl,
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
    await stopDevServers();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
