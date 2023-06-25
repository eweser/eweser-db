import { createClient } from 'matrix-js-sdk';
import { readFileSync } from 'fs';
import { createServer } from 'https';

import { WebSocketServer } from 'ws';
import { join, dirname } from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import type { WebSocketMessage } from '@eweser/websockets';
import { sendMessage, parseMessage } from '@eweser/websockets';

const logger = (data: any, level: 'info' | 'error' = 'info') => {
  // eslint-disable-next-line no-console
  level === 'info' ? console.log(data) : console.error(data);
};

dotenv.config();

const dev = process.env.NODE_ENV !== 'production';

type MatrixLoginRes = {
  access_token: string;
  device_id: string;
  home_server: string;
  user_id: string;
  well_known: { 'm.homeserver': { base_url: string } };
};

const password = process.env.PASSWORD;
const userId = process.env.USER_ID;
const baseUrl = process.env.BASE_URL || 'http://localhost:8888';

if (!password) {
  throw new Error('PASSWORD env var is required');
}
if (!userId) {
  throw new Error('USER_ID env var is required');
}

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
httpsServer.listen(port, () =>
  // eslint-disable-next-line no-console
  console.log('HTTPS server listening on port ' + port)
);

const sockServer = new WebSocketServer({
  server: httpsServer,
});

const tempClient = createClient({ baseUrl });

const loginRes: MatrixLoginRes = await tempClient.loginWithPassword(
  userId,
  password
);

const matrixClient = createClient({
  baseUrl,
  userId,
  accessToken: loginRes.access_token,
  deviceId: loginRes.device_id,
});

export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const rooms = await matrixClient.getJoinedRooms();
console.log({ rooms });

sockServer.on('connection', (ws) => {
  const sendMessageToAll = async (message: WebSocketMessage) => {
    sockServer.clients.forEach((client) => {
      sendMessage(client, message);
    });
  };
  logger('New client connected: ' + ws.url);

  const handleJoinRoom = async (roomId: string) => {
    console.log('joining room', roomId);
    const joined = await matrixClient.joinRoom(roomId);
    if (joined?.roomId === roomId) {
      console.log('joined room', roomId);
      sendMessageToAll({ type: 'joinedRoom', roomId });
    }
  };

  ws.on('message', async (rawMessage) => {
    const message = parseMessage(rawMessage);
    console.log({ message });
    try {
      switch (message.type) {
        case 'joinRoom':
          handleJoinRoom(message.roomId);
          break;
      }
    } catch (error: any) {
      sendMessageToAll({ type: 'error', error });
      logger(error, 'error');
    }
  });
  ws.onerror = function (error) {
    logger(error, 'error');
  };
  ws.on('close', (code, reason) =>
    logger(`Client disconnected.\n code: ${code} reason: ${reason}`)
  );
});
