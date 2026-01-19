import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Database configuration
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'compoundscan',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    connectionString: process.env.DATABASE_URL,
  },

  // RPC configuration
  rpc: {
    sepolia: process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/SMORu6hOAXcJryrxMEoxYcLDOfdYkV4q',
  },

  // Indexer configuration
  // Note: Alchemy free tier limits eth_getLogs to 10 blocks per request (9 block diff)
  indexer: {
    startBlock: parseInt(process.env.INDEXER_START_BLOCK || '10070000'),
    batchSize: parseInt(process.env.INDEXER_BATCH_SIZE || '9'), // Limited by Alchemy free tier
    pollInterval: parseInt(process.env.INDEXER_POLL_INTERVAL || '12000'),
  },

  // Server configuration
  server: {
    port: parseInt(process.env.PORT || '3001'),
    env: process.env.NODE_ENV || 'development',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

export default config;

