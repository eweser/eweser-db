/* eslint-disable @typescript-eslint/no-var-requires */
// in case we run into these issues too https://github.com/developit/microbundle/issues/708, otherwise vscode-lib fails
import 'regenerator-runtime/runtime.js';
import 'lodash';
import 'fake-indexeddb/auto';

const { randomFillSync, subtle } = require('crypto');
(global as any).Olm = require('@matrix-org/olm');
// const { Crypto } = require("@peculiar/webcrypto");
// const crypto = new Crypto();

Object.defineProperty(globalThis, 'crypto', {
  value: {
    getRandomValues: randomFillSync,
    subtle,
  },
});
