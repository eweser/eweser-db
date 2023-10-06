import { MATRIX_CONFIG } from './constants.js';
import { startMatrixClient } from './matrix.js';
import { startServer } from './server.js';
import { connectAllJoinedRooms } from './rooms.js';

export const startApp = async () => {
  const server = startServer();
  const matrixClient = await startMatrixClient(MATRIX_CONFIG);

  await connectAllJoinedRooms(matrixClient);

  return { server, matrixClient };
};

const app = await startApp();

export default app;
