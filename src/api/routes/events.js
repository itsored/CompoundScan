import { Router } from 'express';
import db from '../../db/index.js';

const router = Router();

/**
 * GET /api/events
 * Get all events with pagination and filters
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      event_name,
      contract_address,
      from_block,
      to_block,
      from_date,
      to_date,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    let paramIndex = 1;

    if (event_name) {
      conditions.push(`e.event_name = $${paramIndex++}`);
      params.push(event_name);
    }

    if (contract_address) {
      conditions.push(`e.contract_address = $${paramIndex++}`);
      params.push(contract_address.toLowerCase());
    }

    if (from_block) {
      conditions.push(`e.block_number >= $${paramIndex++}`);
      params.push(parseInt(from_block));
    }

    if (to_block) {
      conditions.push(`e.block_number <= $${paramIndex++}`);
      params.push(parseInt(to_block));
    }

    if (from_date) {
      conditions.push(`e.timestamp >= $${paramIndex++}`);
      params.push(new Date(from_date));
    }

    if (to_date) {
      conditions.push(`e.timestamp <= $${paramIndex++}`);
      params.push(new Date(to_date));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) FROM events e ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get events
    const result = await db.query(
      `SELECT 
         e.id,
         e.tx_hash,
         e.block_number,
         e.log_index,
         e.contract_address,
         e.event_name,
         e.decoded_data,
         e.timestamp,
         c.name as contract_name
       FROM events e
       LEFT JOIN contracts c ON e.contract_id = c.id
       ${whereClause}
       ORDER BY e.block_number DESC, e.log_index DESC
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
    console.error('Error fetching events:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch events' });
  }
});

/**
 * GET /api/events/types
 * Get distinct event types and counts
 */
router.get('/types', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT event_name, COUNT(*) as count
      FROM events
      GROUP BY event_name
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching event types:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch event types' });
  }
});

/**
 * GET /api/events/:txHash
 * Get all events for a transaction
 */
router.get('/tx/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;

    const result = await db.query(
      `SELECT 
         e.*,
         c.name as contract_name
       FROM events e
       LEFT JOIN contracts c ON e.contract_id = c.id
       WHERE e.tx_hash = $1
       ORDER BY e.log_index ASC`,
      [txHash.toLowerCase()]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching transaction events:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transaction events' });
  }
});

export default router;

