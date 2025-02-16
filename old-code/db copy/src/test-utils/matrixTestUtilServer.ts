/* eslint-disable no-console */
import { MATRIX_HOME_URL } from '.';
import Matrix from 'matrix-js-sdk';
import request from 'request';
import * as http from 'http';
import * as https from 'https';

http.globalAgent.maxSockets = 2000;
https.globalAgent.maxSockets = 2000;

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
export function initMatrixSDK() {
  // make sure the matrix sdk initializes request properly
  Matrix.request(request);
}

export async function ensureMatrixIsRunning() {
  initMatrixSDK();
  return await waitForMatrixStart();
}
