import { Router } from 'express';
import db from '../../db/index.js';

const router = Router();

/**
 * GET /api/stats/overview
 * Get protocol overview statistics
 */
router.get('/overview', async (req, res) => {
  try {
    // Total events
    const eventsCount = await db.query('SELECT COUNT(*) FROM events');

    // Total unique addresses
    const addressesCount = await db.query('SELECT COUNT(*) FROM addresses');

    // Total supply events
    const supplyCount = await db.query('SELECT COUNT(*) FROM supply_events');

    // Total withdraw events
    const withdrawCount = await db.query('SELECT COUNT(*) FROM withdraw_events');

    // Total liquidation events
    const liquidationCount = await db.query('SELECT COUNT(*) FROM liquidation_events');

    // Total reward claims
    const rewardCount = await db.query('SELECT COUNT(*) FROM reward_claims');

    // Latest indexed block
    const latestBlock = await db.query(
      'SELECT MAX(last_indexed_block) as block FROM indexer_state'
    );

    // Contracts being tracked
    const contractsCount = await db.query('SELECT COUNT(*) FROM contracts WHERE is_active = true');

    res.json({
      success: true,
      data: {
        totalEvents: parseInt(eventsCount.rows[0].count),
        totalAddresses: parseInt(addressesCount.rows[0].count),
        totalSupplyEvents: parseInt(supplyCount.rows[0].count),
        totalWithdrawEvents: parseInt(withdrawCount.rows[0].count),
        totalLiquidations: parseInt(liquidationCount.rows[0].count),
        totalRewardClaims: parseInt(rewardCount.rows[0].count),
        latestIndexedBlock: latestBlock.rows[0].block || 0,
        contractsTracked: parseInt(contractsCount.rows[0].count),
      },
    });
  } catch (error) {
    console.error('Error fetching overview:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch overview' });
  }
});

/**
 * GET /api/stats/activity
 * Get activity over time (daily event counts)
 */
router.get('/activity', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const result = await db.query(
      `SELECT 
         DATE(timestamp) as date,
         COUNT(*) as event_count,
         COUNT(DISTINCT CASE WHEN event_name = 'Supply' THEN id END) as supply_count,
         COUNT(DISTINCT CASE WHEN event_name = 'Withdraw' THEN id END) as withdraw_count,
         COUNT(DISTINCT CASE WHEN event_name IN ('AbsorbCollateral', 'AbsorbDebt') THEN id END) as liquidation_count
       FROM events
       WHERE timestamp >= NOW() - INTERVAL '${parseInt(days)} days'
       GROUP BY DATE(timestamp)
       ORDER BY date DESC`
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch activity' });
  }
});

/**
 * GET /api/stats/top-addresses
 * Get most active addresses
 */
router.get('/top-addresses', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const result = await db.query(
      `SELECT 
         address,
         label,
         address_type,
         transaction_count,
         first_seen_at,
         last_seen_at
       FROM addresses
       ORDER BY transaction_count DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching top addresses:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch top addresses' });
  }
});

/**
 * GET /api/stats/liquidations
 * Get liquidation statistics
 */
router.get('/liquidations', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // Total liquidations
    const totalResult = await db.query(
      `SELECT 
         COUNT(*) as total_liquidations,
         SUM(collateral_usd_value) as total_collateral_value,
         SUM(base_usd_value) as total_base_value
       FROM liquidation_events
       WHERE timestamp >= NOW() - INTERVAL '${parseInt(days)} days'`
    );

    // Top liquidators
    const liquidatorsResult = await db.query(
      `SELECT 
         absorber_address,
         COUNT(*) as liquidation_count,
         SUM(collateral_usd_value) as total_collateral_value
       FROM liquidation_events
       WHERE timestamp >= NOW() - INTERVAL '${parseInt(days)} days'
       GROUP BY absorber_address
       ORDER BY liquidation_count DESC
       LIMIT 10`
    );

    // Top liquidated
    const liquidatedResult = await db.query(
      `SELECT 
         borrower_address,
         COUNT(*) as times_liquidated,
         SUM(collateral_usd_value) as total_collateral_lost
       FROM liquidation_events
       WHERE timestamp >= NOW() - INTERVAL '${parseInt(days)} days'
       GROUP BY borrower_address
       ORDER BY times_liquidated DESC
       LIMIT 10`
    );

    res.json({
      success: true,
      data: {
        summary: totalResult.rows[0],
        topLiquidators: liquidatorsResult.rows,
        topLiquidated: liquidatedResult.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching liquidation stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch liquidation stats' });
  }
});

/**
 * GET /api/stats/rewards
 * Get reward distribution statistics
 */
router.get('/rewards', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // Total rewards claimed
    const totalResult = await db.query(
      `SELECT 
         COUNT(*) as total_claims,
         SUM(amount_usd) as total_value
       FROM reward_claims
       WHERE timestamp >= NOW() - INTERVAL '${parseInt(days)} days'`
    );

    // Top reward recipients
    const topRecipients = await db.query(
      `SELECT 
         recipient_address,
         COUNT(*) as claim_count,
         SUM(amount) as total_amount
       FROM reward_claims
       WHERE timestamp >= NOW() - INTERVAL '${parseInt(days)} days'
       GROUP BY recipient_address
       ORDER BY total_amount DESC
       LIMIT 10`
    );

    res.json({
      success: true,
      data: {
        summary: totalResult.rows[0],
        topRecipients: topRecipients.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching reward stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reward stats' });
  }
});

/**
 * GET /api/stats/contracts
 * Get tracked contracts information
 */
router.get('/contracts', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        c.*,
        n.name as network_name,
        n.chain_id,
        (SELECT COUNT(*) FROM events e WHERE e.contract_id = c.id) as event_count,
        (SELECT MAX(block_number) FROM events e WHERE e.contract_id = c.id) as last_event_block
      FROM contracts c
      LEFT JOIN networks n ON c.network_id = n.id
      WHERE c.is_active = true
      ORDER BY c.name
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch contracts' });
  }
});

export default router;

