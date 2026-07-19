import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const app = express();
app.use(express.json());

const KEY_FILE = path.join(__dirname, 'master.key');
const PORT = process.env.PORT || 9090;
const SECRET_TOKEN = process.env.KMS_SECRET_TOKEN || 'super-secret-internal-token';

// Generate a 256-bit key if it doesn't exist
if (!fs.existsSync(KEY_FILE)) {
  console.log('Generating new Master Key...');
  const key = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(KEY_FILE, key, { mode: 0o600 }); // Restrict file permissions
}

// Middleware to protect endpoints
const authenticate = (req, res, next) => {
  const token = req.headers['authorization'];
  if (token !== `Bearer ${SECRET_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.get('/key', authenticate, (req, res) => {
  if (!fs.existsSync(KEY_FILE)) {
    return res.status(404).json({ error: 'Key not found or destroyed' });
  }
  const key = fs.readFileSync(KEY_FILE, 'utf8');
  res.json({ key });
});

// The Panic Button (Crypto-Shredding)
app.post('/kill-switch', authenticate, (req, res) => {
  console.log('KILL SWITCH ACTIVATED! Destroying Master Key...');
  try {
    // Overwrite file multiple times before deleting to prevent recovery
    if (fs.existsSync(KEY_FILE)) {
      for(let i=0; i<3; i++) {
        fs.writeFileSync(KEY_FILE, crypto.randomBytes(64).toString('hex'));
      }
      fs.unlinkSync(KEY_FILE);
    }
    res.json({ message: 'Master Key destroyed permanently. All encrypted data is now unrecoverable.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to destroy key' });
  }
});

let lastHeartbeat = Date.now();
app.post('/heartbeat', authenticate, (req, res) => {
  lastHeartbeat = Date.now();
  res.json({ status: 'ok' });
});

// Dead man's switch: If no heartbeat for 5 minutes, self-destruct
setInterval(() => {
  const timeSinceLastHeartbeat = Date.now() - lastHeartbeat;
  if (timeSinceLastHeartbeat > 5 * 60 * 1000) {
    console.log('NO HEARTBEAT DETECTED FOR 5 MINUTES. Triggering Dead Mans Switch...');
    if (fs.existsSync(KEY_FILE)) {
      fs.writeFileSync(KEY_FILE, crypto.randomBytes(64).toString('hex'));
      fs.unlinkSync(KEY_FILE);
      console.log('Key destroyed.');
    }
  }
}, 60000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`KMS Service running on port ${PORT} - ISOLATE THIS SERVER`);
});
