import { Router } from 'express';
import eventsRouter from './routes/events.js';
import transactionsRouter from './routes/transactions.js';
import addressesRouter from './routes/addresses.js';
import statsRouter from './routes/stats.js';
import liveRouter from './routes/live.js';
import etherscanRouter from './routes/etherscan.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
router.use('/events', eventsRouter);
router.use('/transactions', transactionsRouter);
router.use('/addresses', addressesRouter);
router.use('/stats', statsRouter);
router.use('/live', liveRouter); // Live blockchain data via RPC
router.use('/etherscan', etherscanRouter); // Data from Etherscan API (no DB required!)

// Search endpoint - search across all data types
router.get('/search', async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 3) {
    return res.status(400).json({
      success: false,
      error: 'Search query must be at least 3 characters',
    });
  }

  try {
    const db = (await import('../db/index.js')).default;

    // Check if it's a transaction hash (66 chars starting with 0x)
    if (q.match(/^0x[a-fA-F0-9]{64}$/)) {
      const txResult = await db.query(
        `SELECT 'transaction' as type, tx_hash as id, tx_hash, block_number, timestamp
         FROM transactions WHERE tx_hash = $1
         UNION ALL
         SELECT 'event' as type, id::text, tx_hash, block_number, timestamp
         FROM events WHERE tx_hash = $1`,
        [q.toLowerCase()]
      );

      return res.json({
        success: true,
        query: q,
        results: txResult.rows,
      });
    }

    // Check if it's an address (42 chars starting with 0x)
    if (q.match(/^0x[a-fA-F0-9]{40}$/)) {
      const addressResult = await db.query(
        `SELECT 'address' as type, address as id, address, transaction_count, first_seen_at
         FROM addresses WHERE address = $1`,
        [q.toLowerCase()]
      );

      const contractResult = await db.query(
        `SELECT 'contract' as type, id::text, address, name, contract_type
         FROM contracts WHERE address = $1`,
        [q.toLowerCase()]
      );

      return res.json({
        success: true,
        query: q,
        results: [...addressResult.rows, ...contractResult.rows],
      });
    }

    // General search - search in event names, function names, etc.
    const eventResult = await db.query(
      `SELECT 'event' as type, id::text, event_name as name, tx_hash, block_number
       FROM events WHERE event_name ILIKE $1
       LIMIT 20`,
      [`%${q}%`]
    );

    res.json({
      success: true,
      query: q,
      results: eventResult.rows,
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

export default router;

