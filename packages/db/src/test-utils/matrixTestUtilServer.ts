/* eslint-disable no-console */
import { MATRIX_HOME_URL } from '.';

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
  // eslint-disable-next-line no-constant-condition
  while (true) {
    console.log('Waiting for Matrix to start...');
    if (await hasMatrixStarted()) {
      console.log('Matrix has started!');
      return;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 3000);
    });
  }
}

export async function ensureMatrixIsRunning() {
  return await waitForMatrixStart();
}
