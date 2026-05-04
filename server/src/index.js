import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import resumeRoutes from './routes/resumeRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import generateRoutes from './routes/generateRoutes.js';
import deployRoutes from './routes/deployRoutes.js';

const app = express();
const port = process.env.PORT || 5000;
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    const isLocalVite = /^http:\/\/(localhost|127\.0\.0\.1):517\d$/.test(origin || '');

    if (!origin || allowedOrigins.includes(origin) || isLocalVite) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true
}));
app.options('*', cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.status(200).send('200 OK');
});

app.use('/api/resume', resumeRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/deploy', deployRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  const payload = {
    error: err.message || 'Unexpected server error'
  };

  if (err.groq) {
    payload.provider = 'groq';
    payload.details = err.groq;
    payload.providerStatus = err.groqStatus;
  }

  res.status(err.status || 500).json(payload);
});

const server = app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the existing server or set PORT to another value.`);
    process.exit(1);
  }

  throw error;
});
