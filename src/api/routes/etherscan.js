import { Router } from 'express';
import etherscan from '../../services/etherscan.js';

const router = Router();

// Check if Etherscan API key is configured
router.get('/status', (req, res) => {
  const hasKey = etherscan.hasApiKey();
  res.json({
    success: true,
    data: {
      configured: hasKey,
      message: hasKey 
        ? 'Etherscan API key configured' 
        : 'No Etherscan API key. Set ETHERSCAN_API_KEY env variable. Get free key at https://etherscan.io/apis',
    },
  });
});

/**
 * GET /api/etherscan/events
 * Get recent events from Etherscan
 */
router.get('/events', async (req, res) => {
  try {
    const { limit = 50, type } = req.query;

    let events;
    if (type) {
      events = await etherscan.getEventsByType(type, parseInt(limit));
    } else {
      events = await etherscan.getRecentEvents(parseInt(limit));
    }

    res.json({
      success: true,
      data: events,
      source: 'etherscan',
    });
  } catch (error) {
    console.error('Etherscan events error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/etherscan/events/types
 * Get available event types
 */
router.get('/events/types', async (req, res) => {
  try {
    const events = await etherscan.getRecentEvents(100);
    
    // Count by type
    const typeCounts = {};
    events.forEach(e => {
      typeCounts[e.eventName] = (typeCounts[e.eventName] || 0) + 1;
    });

    const types = Object.entries(typeCounts)
      .map(([name, count]) => ({ event_name: name, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: types,
    });
  } catch (error) {
    console.error('Etherscan event types error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/etherscan/transactions
 * Get recent transactions
 */
router.get('/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const transactions = await etherscan.getContractTransactions({
      page: parseInt(page),
      offset: parseInt(limit),
    });

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
      },
      source: 'etherscan',
    });
  } catch (error) {
    console.error('Etherscan transactions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/etherscan/tx/:txHash
 * Get transaction details
 */
router.get('/tx/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;
    const transaction = await etherscan.getTransactionByHash(txHash);

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    res.json({
      success: true,
      data: transaction,
      source: 'etherscan',
    });
  } catch (error) {
    console.error('Etherscan tx error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/etherscan/addresses
 * Get unique addresses
 */
router.get('/addresses', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const addresses = await etherscan.getUniqueAddresses(parseInt(limit));

    res.json({
      success: true,
      data: addresses,
      source: 'etherscan',
    });
  } catch (error) {
    console.error('Etherscan addresses error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/etherscan/address/:address
 * Get address activity
 */
router.get('/address/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const activity = await etherscan.getAddressActivity(address);

    res.json({
      success: true,
      data: activity,
      source: 'etherscan',
    });
  } catch (error) {
    console.error('Etherscan address error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/etherscan/stats
 * Get contract statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await etherscan.getContractStats();

    res.json({
      success: true,
      data: stats,
      source: 'etherscan',
    });
  } catch (error) {
    console.error('Etherscan stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/etherscan/query
 * Query addresses and activities by date range
 */
router.get('/query', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required (format: YYYY-MM-DD)',
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD',
      });
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        error: 'startDate must be before endDate',
      });
    }

    const result = await etherscan.queryByDateRange(startDate, endDate);

    res.json({
      success: true,
      data: result,
      source: 'etherscan',
    });
  } catch (error) {
    console.error('Etherscan query error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

