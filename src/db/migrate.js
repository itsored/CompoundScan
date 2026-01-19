import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './index.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  logger.info('Starting database migration...');

  try {
    // Check connection
    const connected = await db.checkConnection();
    if (!connected) {
      throw new Error('Could not connect to database');
    }

    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split by statements and execute
    const statements = schema
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      try {
        await db.query(statement);
        logger.debug('Executed statement successfully');
      } catch (error) {
        // Ignore "already exists" errors
        if (!error.message.includes('already exists')) {
          logger.error('Migration statement error', { error: error.message });
        }
      }
    }

    logger.info('Database migration completed successfully!');
  } catch (error) {
    logger.error('Migration failed', error);
    process.exit(1);
  } finally {
    await db.closePool();
  }
}

migrate();

