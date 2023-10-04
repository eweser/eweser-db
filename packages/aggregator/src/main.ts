import express from 'express';
const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

app.get('/ping', (req, res) => {
  res.send('pong');
});

app.listen(port, () => {
  return console.log(`http://localhost:${port}`);
});

export default app;
