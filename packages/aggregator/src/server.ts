import express from 'express';

export const startServer = () => {
  const server = express();
  const port = process.env.PORT || 3333;
  server.use(express.json());

  server.get('/ping', (_req, res) => {
    res.send('pong');
  });

  server.listen(port, () => {
    // eslint-disable-next-line no-console
    return console.log(`Server started on port: ${port}`);
  });
};
