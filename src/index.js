import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import db from './db/index.js';
import apiRouter from './api/index.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.debug(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// API routes
app.use('/api', apiRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'CompoundScan API',
    version: '1.0.0',
    description: 'Explorer for Compound V3 (Comet) Protocol',
    endpoints: {
      health: '/api/health',
      stats: '/api/stats/overview',
      events: '/api/events',
      transactions: '/api/transactions',
      addresses: '/api/addresses',
      search: '/api/search?q=<query>',
    },
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error', err);
  res.status(500).json({
    success: false,
    error: config.server.env === 'development' ? err.message : 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Start server
async function start() {
  try {
    // Check database connection
    const connected = await db.checkConnection();
    if (!connected) {
      logger.warn('Database not connected. Some features may not work.');
    }

    app.listen(config.server.port, () => {
      logger.info(`CompoundScan API server running on port ${config.server.port}`);
      logger.info(`Environment: ${config.server.env}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await db.closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await db.closePool();
  process.exit(0);
});

start();

export default app;

