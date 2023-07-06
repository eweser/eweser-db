import { readFileSync } from 'fs';
import { createServer } from 'https';

import { WebSocketServer } from 'ws';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from './helpers.js';
import { dev } from './constants.js';

export const initServer = async () => {
  const httpsOptions = {
    key: readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../certs/key.pem')
    ),
    cert: readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../certs/cert.pem')
    ),
  };

  const httpsServer = createServer(httpsOptions);
  const port = dev ? 3333 : 443;

  // kill service on port 3333 if already exists:
  // sudo kill -9 $(sudo lsof -t -i:3333)

  httpsServer.listen(port, () =>
    logger('HTTPS server listening on port ' + port)
  );

  const sockServer = new WebSocketServer({
    server: httpsServer,
  });

  return sockServer;
};
