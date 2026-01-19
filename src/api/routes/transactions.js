import { Router } from 'express';
import db from '../../db/index.js';

const router = Router();

/**
 * GET /api/transactions
 * Get all transactions with pagination and filters
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      from_address,
      to_address,
      function_name,
      status,
      from_block,
      to_block,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    let paramIndex = 1;

    if (from_address) {
      conditions.push(`t.from_address = $${paramIndex++}`);
      params.push(from_address.toLowerCase());
    }

    if (to_address) {
      conditions.push(`t.to_address = $${paramIndex++}`);
      params.push(to_address.toLowerCase());
    }

    if (function_name) {
      conditions.push(`t.function_name = $${paramIndex++}`);
      params.push(function_name);
    }

    if (status !== undefined) {
      conditions.push(`t.status = $${paramIndex++}`);
      params.push(parseInt(status));
    }

    if (from_block) {
      conditions.push(`t.block_number >= $${paramIndex++}`);
      params.push(parseInt(from_block));
    }

    if (to_block) {
      conditions.push(`t.block_number <= $${paramIndex++}`);
      params.push(parseInt(to_block));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) FROM transactions t ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get transactions
    const result = await db.query(
      `SELECT 
         t.id,
         t.tx_hash,
         t.block_number,
         t.from_address,
         t.to_address,
         t.value,
         t.gas_used,
         t.function_name,
         t.status,
         t.timestamp,
         c.name as contract_name
       FROM transactions t
       LEFT JOIN contracts c ON t.contract_id = c.id
       ${whereClause}
       ORDER BY t.block_number DESC, t.tx_index DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
});

/**
 * GET /api/transactions/:txHash
 * Get transaction details
 */
router.get('/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;

    const txResult = await db.query(
      `SELECT 
         t.*,
         c.name as contract_name
       FROM transactions t
       LEFT JOIN contracts c ON t.contract_id = c.id
       WHERE t.tx_hash = $1`,
      [txHash.toLowerCase()]
    );

    if (txResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    // Get associated events
    const eventsResult = await db.query(
      `SELECT * FROM events WHERE tx_hash = $1 ORDER BY log_index ASC`,
      [txHash.toLowerCase()]
    );

    res.json({
      success: true,
      data: {
        ...txResult.rows[0],
        events: eventsResult.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transaction' });
  }
});

export default router;

