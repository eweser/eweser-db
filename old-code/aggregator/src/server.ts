import express from 'express';
import { PORT } from './constants';

export const startServer = () => {
  const server = express();

  server.use(express.json());

  server.get('/ping', (_req, res) => {
    res.send('pong');
  });

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    return console.log(`Server started on port: ${PORT}`);
  });
  return server;
};
