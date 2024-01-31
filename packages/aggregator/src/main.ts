import { MATRIX_CONFIG } from './constants.js';
import { startMatrixClient } from './matrix.js';
import { startServer } from './server.js';
import { connectAllJoinedRooms } from './rooms.js';
import { joinRoomGetHandler } from './api/join-room-get.js';

export const startApp = async () => {
  const server = startServer();

  const matrixClient = await startMatrixClient(MATRIX_CONFIG);

  await connectAllJoinedRooms(matrixClient);

  // endpoints
  server.use((req, res) => joinRoomGetHandler(req, res, matrixClient));

  return { server, matrixClient };
};

const app = await startApp();

export default app;
