import { Router } from 'express';
import db from '../../db/index.js';

const router = Router();

/**
 * GET /api/addresses
 * Get all tracked addresses with pagination
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, type, sort = 'transaction_count', order = 'desc' } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    let paramIndex = 1;

    if (type) {
      conditions.push(`address_type = $${paramIndex++}`);
      params.push(type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderClause = `ORDER BY ${sort} ${order.toUpperCase()}`;

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) FROM addresses ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get addresses
    const result = await db.query(
      `SELECT * FROM addresses
       ${whereClause}
       ${orderClause}
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
    console.error('Error fetching addresses:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch addresses' });
  }
});

/**
 * GET /api/addresses/:address
 * Get address details and activity
 */
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const normalizedAddress = address.toLowerCase();

    // Get address info
    const addressResult = await db.query(
      `SELECT * FROM addresses WHERE address = $1`,
      [normalizedAddress]
    );

    // Get supply events
    const supplyEvents = await db.query(
      `SELECT * FROM supply_events 
       WHERE from_address = $1 OR to_address = $1
       ORDER BY timestamp DESC LIMIT 50`,
      [normalizedAddress]
    );

    // Get supply collateral events
    const supplyCollateralEvents = await db.query(
      `SELECT * FROM supply_collateral_events 
       WHERE from_address = $1 OR to_address = $1
       ORDER BY timestamp DESC LIMIT 50`,
      [normalizedAddress]
    );

    // Get withdraw events
    const withdrawEvents = await db.query(
      `SELECT * FROM withdraw_events 
       WHERE src_address = $1 OR to_address = $1
       ORDER BY timestamp DESC LIMIT 50`,
      [normalizedAddress]
    );

    // Get withdraw collateral events
    const withdrawCollateralEvents = await db.query(
      `SELECT * FROM withdraw_collateral_events 
       WHERE src_address = $1 OR to_address = $1
       ORDER BY timestamp DESC LIMIT 50`,
      [normalizedAddress]
    );

    // Get liquidation events (as absorber or borrower)
    const liquidationEvents = await db.query(
      `SELECT * FROM liquidation_events 
       WHERE absorber_address = $1 OR borrower_address = $1
       ORDER BY timestamp DESC LIMIT 50`,
      [normalizedAddress]
    );

    // Get reward claims
    const rewardClaims = await db.query(
      `SELECT * FROM reward_claims 
       WHERE src_address = $1 OR recipient_address = $1
       ORDER BY timestamp DESC LIMIT 50`,
      [normalizedAddress]
    );

    // Get all events for this address
    const allEvents = await db.query(
      `SELECT e.* FROM events e
       WHERE e.decoded_data::text ILIKE $1
       ORDER BY e.timestamp DESC LIMIT 100`,
      [`%${normalizedAddress}%`]
    );

    res.json({
      success: true,
      data: {
        address: addressResult.rows[0] || { address: normalizedAddress },
        activity: {
          supplies: supplyEvents.rows,
          supplyCollaterals: supplyCollateralEvents.rows,
          withdraws: withdrawEvents.rows,
          withdrawCollaterals: withdrawCollateralEvents.rows,
          liquidations: liquidationEvents.rows,
          rewardClaims: rewardClaims.rows,
        },
        events: allEvents.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching address:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch address' });
  }
});

/**
 * GET /api/addresses/:address/supplies
 * Get supply history for an address
 */
router.get('/:address/supplies', async (req, res) => {
  try {
    const { address } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await db.query(
      `SELECT se.*, c.name as market_name, c.base_token_symbol
       FROM supply_events se
       LEFT JOIN contracts c ON se.contract_id = c.id
       WHERE se.from_address = $1 OR se.to_address = $1
       ORDER BY se.timestamp DESC
       LIMIT $2 OFFSET $3`,
      [address.toLowerCase(), parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching supplies:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch supplies' });
  }
});

/**
 * GET /api/addresses/:address/borrows
 * Get borrow (withdraw) history for an address
 */
router.get('/:address/borrows', async (req, res) => {
  try {
    const { address } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await db.query(
      `SELECT we.*, c.name as market_name, c.base_token_symbol
       FROM withdraw_events we
       LEFT JOIN contracts c ON we.contract_id = c.id
       WHERE we.src_address = $1 OR we.to_address = $1
       ORDER BY we.timestamp DESC
       LIMIT $2 OFFSET $3`,
      [address.toLowerCase(), parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching borrows:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch borrows' });
  }
});

export default router;

