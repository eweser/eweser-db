import * as cp from 'child_process';

export const MATRIX_HOME_URL = new URL('http://localhost:8888/_matrix/static/');

export const HOMESERVER_NAME = 'localhost:8888';
export const matrixTestConfig = {
  baseUrl: 'http://' + HOMESERVER_NAME,
  // idBaseUrl: "https://vector.im",
};

async function hasMatrixStarted() {
  try {
    const res = await fetch(MATRIX_HOME_URL.toString());
    // console.log(res);
    return res.status === 200;
  } catch (e) {
    // console.error(e);
    return false;
  }
}

async function waitForMatrixStart() {
  while (true) {
    console.log('Waiting for Matrix to start...');
    if (await hasMatrixStarted()) {
      console.log('Matrix has started!');
      return;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });
  }
}

export async function ensureMatrixIsRunning() {
  if (!(await hasMatrixStarted())) {
    console.log('Starting matrix using docker-compose');
    const ret = cp.execSync('docker compose up -d', {
      cwd: '../../../test-server',
    });
    console.log(ret.toString('utf-8'));
  }

  return await waitForMatrixStart();
}
