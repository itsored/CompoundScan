import pg from 'pg';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

// Create connection pool
const pool = new Pool(
  config.db.connectionString
    ? { connectionString: config.db.connectionString }
    : {
        host: config.db.host,
        port: config.db.port,
        database: config.db.database,
        user: config.db.user,
        password: config.db.password,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
);

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected database pool error', err);
});

/**
 * Execute a query
 */
export async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug(`Query executed in ${duration}ms`, { rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Database query error', { error: error.message, query: text });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient() {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = () => client.release();

  // Timeout to auto-release client after 30 seconds
  const timeout = setTimeout(() => {
    logger.error('Client checked out for more than 30 seconds!');
    release();
  }, 30000);

  return {
    query,
    release: () => {
      clearTimeout(timeout);
      release();
    },
  };
}

/**
 * Execute a transaction
 */
export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check database connection
 */
export async function checkConnection() {
  try {
    const result = await query('SELECT NOW()');
    logger.info('Database connected successfully');
    return true;
  } catch (error) {
    logger.error('Database connection failed', error);
    return false;
  }
}

/**
 * Close all connections
 */
export async function closePool() {
  await pool.end();
  logger.info('Database pool closed');
}

export default {
  query,
  getClient,
  transaction,
  checkConnection,
  closePool,
  pool,
};

