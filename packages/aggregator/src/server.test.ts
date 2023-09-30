import { describe, it } from 'vitest';
import { initServer } from './server';

import { pingTestServer } from './test-utils';

describe('server', () => {
  it('starts a websocket server', async () => {
    await initServer();
    await pingTestServer();
  });
});
