import 'dotenv/config';
import express from 'express';
import assistantRoutes from './routes/assistant.routes';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3001;

  // CORS middleware for standalone frontend integration
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
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

  // Assistant REST API endpoints
  app.use('/api/assistant', assistantRoutes);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Fox API Server] Running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Fox API Server] Failed to start:', err);
  process.exit(1);
});
