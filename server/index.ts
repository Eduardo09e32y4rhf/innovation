import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api', (req, res) => {
  res.send('Innovation.ia API is running');
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Backend operational (Node.js)'
  });
});

// Add more routes here

export default app;
