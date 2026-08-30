import 'dotenv/config';
import express from 'express';
import assistantRoutes from './routes/assistant.routes';
import livekitRoutes from './routes/livekit.routes';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3001;

  // CORS middleware — wildcard in dev, restricted to ALLOWED_ORIGINS in production
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  app.use((req, res, next) => {
    const origin = req.headers.origin || '';
    const isDev = process.env.NODE_ENV !== 'production';

    if (isDev || allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', isDev ? '*' : origin);
    }
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // API health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Fox Jarvis AI Assistant Server',
      timestamp: Date.now(),
    });
  });

  // Existing assistant REST endpoints remain unchanged.
  app.use('/api/assistant', assistantRoutes);

  // LiveKit token minting is isolated so the existing voice path still works
  // when realtime voice is disabled in the frontend.
  app.use('/api/livekit', livekitRoutes);

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[Fox API Server] Running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Fox API Server] Failed to start:', err);
  process.exit(1);
});
