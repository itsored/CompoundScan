/**
 * Etherscan API V2 Service with Caching
 * Fetches data from Etherscan API (multichain support)
 * 
 * V2 API: Uses chainid parameter for multichain
 * Free tier: ~3 calls/second, ~100,000 calls/day
 * 
 * Includes caching to reduce API calls and avoid rate limits
 */

// V2 API base URL (supports multichain via chainid parameter)
const ETHERSCAN_API_URL = 'https://api.etherscan.io/v2/api';

// Sepolia chain ID
const CHAIN_ID = 11155111;

// API Key
const API_KEY = process.env.ETHERSCAN_API_KEY || 'RSCZKJUNF64F6HD8WMHJ3KGXGYFAXPPM8Y';

// Comet WETH Market on Sepolia
const COMET_ADDRESS = '0x2943ac1216979aD8dB76D9147F64E61adc126e96';

// Event signatures (topic0) - keccak256 hashes
const EVENT_TOPICS = {
  Supply: '0xd1cf3d156d5f8f0d50f6c122ed609cec09d35c9b9fb3fff6ea0959134dae424e',
  Withdraw: '0x9b1bfa7fa9ee420a16e124f794c35ac9f90472acc99140eb2f6447c714cad8eb',
  SupplyCollateral: '0xfa56f7b24f17183d81894d3ac2ee654e3c26388d17a28dbd9549b8114304e1f4',
  WithdrawCollateral: '0xd6d480d5b3068db003533b170d67561494d72e3bf9fa40a266f1c14bae5b4839',
  AbsorbCollateral: '0x9850ab1af75177e4a9201c65a2cf7fd60f412c71fcf473ea38903507729e875e',
  Transfer: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
};

// Simple in-memory cache
const cache = {
  data: new Map(),
  ttl: 60000, // 60 seconds cache TTL
  
  get(key) {
    const item = this.data.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.data.delete(key);
      return null;
    }
    return item.value;
  },
  
  set(key, value, ttl = this.ttl) {
    this.data.set(key, {
      value,
      expiry: Date.now() + ttl,
    });
  },
};

// Check if API key is configured
export function hasApiKey() {
  return API_KEY.length > 0;
}

/**
 * Make a request to Etherscan API V2 with rate limiting
 */
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 350; // 350ms between requests (under 3/sec limit)

async function etherscanRequest(params) {
  // Rate limiting - wait if needed
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();

  const url = new URL(ETHERSCAN_API_URL);
  
  // Add chain ID for V2
  params.chainid = CHAIN_ID;
  
  // Add API key
  if (API_KEY) {
    params.apikey = API_KEY;
  }
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });

  console.log('Etherscan request:', url.toString().replace(API_KEY, 'API_KEY'));

  const response = await fetch(url.toString());
  const data = await response.json();

  // Check for errors
  if (data.status === '0' && data.message !== 'No transactions found' && data.message !== 'No records found') {
    if (data.result === 'No transactions found' || data.result === 'No records found') {
      return { ...data, result: [] };
    }
    throw new Error(data.result || data.message || 'Etherscan API error');
  }

  return data;
}

/**
 * Get transactions for the Comet contract (cached)
 */
export async function getContractTransactions(options = {}) {
  const { page = 1, offset = 50, sort = 'desc' } = options;
  
  const cacheKey = `transactions_${page}_${offset}_${sort}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('Using cached transactions');
    return cached;
  }

  try {
    const data = await etherscanRequest({
      module: 'account',
      action: 'txlist',
      address: COMET_ADDRESS,
      startblock: 0,
      endblock: 99999999,
      page,
      offset,
      sort,
    });

    const results = Array.isArray(data.result) ? data.result : [];
    
    const transactions = results.map(tx => ({
      txHash: tx.hash,
      blockNumber: parseInt(tx.blockNumber),
      timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
      from: tx.from,
      to: tx.to,
      value: tx.value,
      gasUsed: tx.gasUsed,
      gasPrice: tx.gasPrice,
      isError: tx.isError === '1',
      functionName: tx.functionName?.split('(')[0] || tx.methodId || 'Unknown',
      methodId: tx.methodId,
    }));

    cache.set(cacheKey, transactions);
    return transactions;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

/**
 * Get event logs for the Comet contract
 */
export async function getEventLogs(options = {}) {
  const {
    fromBlock = 0,
    toBlock = 'latest',
    topic0 = null,
    page = 1,
    offset = 100,
  } = options;

  const params = {
    module: 'logs',
    action: 'getLogs',
    address: COMET_ADDRESS,
    fromBlock,
    toBlock,
    page,
    offset,
  };

  if (topic0) {
    params.topic0 = topic0;
  }

  const data = await etherscanRequest(params);
  return Array.isArray(data.result) ? data.result : [];
}

/**
 * Get current block number from Etherscan
 */
async function getCurrentBlockNumber() {
  try {
    const data = await etherscanRequest({
      module: 'proxy',
      action: 'eth_blockNumber',
    });
    return parseInt(data.result, 16);
  } catch (error) {
    console.error('Error getting block number:', error);
    return null;
  }
}

/**
 * Get all recent events (cached, queries from recent blocks)
 */
export async function getRecentEvents(limit = 50) {
  const cacheKey = `recent_events_${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('Using cached events');
    return cached;
  }

  try {
    // Get current block number first
    const currentBlock = await getCurrentBlockNumber();
    if (!currentBlock) {
      console.log('Could not get current block, falling back to fromBlock: 0');
    }

    // Query from recent blocks (last ~3 months worth of blocks on Sepolia)
    // Sepolia: ~12 sec blocks, so ~7200 blocks/day, ~200k blocks/month
    const blocksToLookBack = 600000; // ~3 months
    const fromBlock = currentBlock ? Math.max(0, currentBlock - blocksToLookBack) : 0;

    console.log(`Fetching events from block ${fromBlock} to latest (current: ${currentBlock || 'unknown'})`);

    const logs = await getEventLogs({
      fromBlock,
      toBlock: 'latest',
      offset: 1000, // Get up to 1000 events
    });

    const events = logs.map(log => parseEventLog(log)).filter(e => e !== null);
    
    // Sort by block number descending (newest first)
    events.sort((a, b) => b.blockNumber - a.blockNumber);
    
    const result = events.slice(0, limit);
    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching recent events:', error);
    return [];
  }
}

/**
 * Get events by type
 */
export async function getEventsByType(eventType, limit = 50) {
  const topic0 = EVENT_TOPICS[eventType];
  if (!topic0) {
    throw new Error(`Unknown event type: ${eventType}`);
  }

  const logs = await getEventLogs({
    topic0,
    offset: limit,
  });

  const events = logs.map(log => parseEventLog(log)).filter(e => e !== null);
  events.sort((a, b) => b.blockNumber - a.blockNumber);
  return events;
}

/**
 * Parse an event log into a readable format
 */
function parseEventLog(log) {
  if (!log || !log.topics || !log.topics[0]) return null;

  const eventName = getEventName(log.topics[0]);
  const blockNumber = parseInt(log.blockNumber, 16);
  const timestamp = log.timeStamp 
    ? new Date(parseInt(log.timeStamp, 16) * 1000).toISOString()
    : new Date().toISOString();
  
  return {
    eventName,
    txHash: log.transactionHash,
    blockNumber,
    timestamp,
    logIndex: parseInt(log.logIndex || '0x0', 16),
    contractAddress: log.address,
    topics: log.topics,
    data: log.data,
    decoded: decodeEventData(eventName, log),
  };
}

/**
 * Get event name from topic0
 */
function getEventName(topic0) {
  if (!topic0) return 'Unknown';
  const lowerTopic = topic0.toLowerCase();
  for (const [name, topic] of Object.entries(EVENT_TOPICS)) {
    if (topic.toLowerCase() === lowerTopic) {
      return name;
    }
  }
  return 'Unknown';
}

/**
 * Decode event data based on event type
 */
function decodeEventData(eventName, log) {
  try {
    const topics = log.topics || [];
    const data = log.data || '0x';

    switch (eventName) {
      case 'Supply':
        return {
          from: topics[1] ? '0x' + topics[1].slice(26) : null,
          dst: topics[2] ? '0x' + topics[2].slice(26) : null,
          amount: data !== '0x' ? BigInt(data).toString() : '0',
        };
      
      case 'Withdraw':
        return {
          src: topics[1] ? '0x' + topics[1].slice(26) : null,
          to: topics[2] ? '0x' + topics[2].slice(26) : null,
          amount: data !== '0x' ? BigInt(data).toString() : '0',
        };
      
      case 'SupplyCollateral':
        return {
          from: topics[1] ? '0x' + topics[1].slice(26) : null,
          dst: topics[2] ? '0x' + topics[2].slice(26) : null,
          asset: topics[3] ? '0x' + topics[3].slice(26) : null,
          amount: data !== '0x' ? BigInt(data).toString() : '0',
        };
      
      case 'WithdrawCollateral':
        return {
          src: topics[1] ? '0x' + topics[1].slice(26) : null,
          to: topics[2] ? '0x' + topics[2].slice(26) : null,
          asset: topics[3] ? '0x' + topics[3].slice(26) : null,
          amount: data !== '0x' ? BigInt(data).toString() : '0',
        };
      
      case 'Transfer':
        return {
          from: topics[1] ? '0x' + topics[1].slice(26) : null,
          to: topics[2] ? '0x' + topics[2].slice(26) : null,
          amount: data !== '0x' ? BigInt(data).toString() : '0',
        };
      
      case 'AbsorbCollateral':
        return {
          absorber: topics[1] ? '0x' + topics[1].slice(26) : null,
          borrower: topics[2] ? '0x' + topics[2].slice(26) : null,
          asset: topics[3] ? '0x' + topics[3].slice(26) : null,
        };
      
      default:
        return null;
    }
  } catch (e) {
    console.error('Error decoding event:', e);
    return null;
  }
}

/**
 * Get transaction details by hash
 */
export async function getTransactionByHash(txHash) {
  try {
    const receiptData = await etherscanRequest({
      module: 'proxy',
      action: 'eth_getTransactionReceipt',
      txhash: txHash,
    });

    const receipt = receiptData.result;
    if (!receipt) return null;

    const txData = await etherscanRequest({
      module: 'proxy',
      action: 'eth_getTransactionByHash',
      txhash: txHash,
    });

    const tx = txData.result;
    if (!tx) return null;

    const blockData = await etherscanRequest({
      module: 'proxy',
      action: 'eth_getBlockByNumber',
      tag: tx.blockNumber,
      boolean: 'false',
    });

    const block = blockData.result;

    const events = (receipt.logs || [])
      .filter(log => log.address.toLowerCase() === COMET_ADDRESS.toLowerCase())
      .map(log => parseEventLog({
        ...log,
        timeStamp: block?.timestamp || '0x0',
        transactionHash: txHash,
      }))
      .filter(e => e !== null);

    return {
      txHash: tx.hash,
      blockNumber: parseInt(tx.blockNumber, 16),
      timestamp: block ? new Date(parseInt(block.timestamp, 16) * 1000).toISOString() : null,
      from: tx.from,
      to: tx.to,
      value: BigInt(tx.value).toString(),
      gasUsed: parseInt(receipt.gasUsed, 16),
      gasPrice: BigInt(tx.gasPrice).toString(),
      status: receipt.status === '0x1' ? 1 : 0,
      input: tx.input,
      events,
    };
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return null;
  }
}

/**
 * Get unique addresses that interacted with the contract (cached)
 */
export async function getUniqueAddresses(limit = 100) {
  const cacheKey = `unique_addresses_${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('Using cached addresses');
    return cached;
  }

  try {
    const transactions = await getContractTransactions({ offset: 200 });
    
    const addressMap = new Map();
    
    transactions.forEach(tx => {
      const addr = tx.from.toLowerCase();
      if (!addressMap.has(addr)) {
        addressMap.set(addr, {
          address: tx.from,
          txCount: 0,
          firstSeen: tx.timestamp,
          lastSeen: tx.timestamp,
        });
      }
      const fromAddr = addressMap.get(addr);
      fromAddr.txCount++;
      if (tx.timestamp < fromAddr.firstSeen) fromAddr.firstSeen = tx.timestamp;
      if (tx.timestamp > fromAddr.lastSeen) fromAddr.lastSeen = tx.timestamp;
    });

    const result = Array.from(addressMap.values())
      .sort((a, b) => b.txCount - a.txCount)
      .slice(0, limit);
    
    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching addresses:', error);
    return [];
  }
}

/**
 * Get address activity
 */
export async function getAddressActivity(address) {
  try {
    const allEvents = await getRecentEvents(500);
    
    const addressLower = address.toLowerCase();
    
    const relevantEvents = allEvents.filter(event => {
      if (!event.decoded) return false;
      const d = event.decoded;
      return (
        d.from?.toLowerCase() === addressLower ||
        d.to?.toLowerCase() === addressLower ||
        d.dst?.toLowerCase() === addressLower ||
        d.src?.toLowerCase() === addressLower ||
        d.absorber?.toLowerCase() === addressLower ||
        d.borrower?.toLowerCase() === addressLower
      );
    });

    return {
      address,
      totalEvents: relevantEvents.length,
      events: relevantEvents,
      supplies: relevantEvents.filter(e => e.eventName === 'Supply' || e.eventName === 'SupplyCollateral'),
      withdraws: relevantEvents.filter(e => e.eventName === 'Withdraw' || e.eventName === 'WithdrawCollateral'),
      liquidations: relevantEvents.filter(e => e.eventName === 'AbsorbCollateral'),
      transfers: relevantEvents.filter(e => e.eventName === 'Transfer'),
    };
  } catch (error) {
    console.error('Error fetching address activity:', error);
    return { address, totalEvents: 0, events: [], supplies: [], withdraws: [], liquidations: [], transfers: [] };
  }
}

/**
 * Get contract stats (cached)
 */
export async function getContractStats() {
  const cacheKey = 'contract_stats';
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('Using cached stats');
    return cached;
  }

  try {
    // Fetch transactions first (they're sorted by most recent already)
    const transactions = await getContractTransactions({ offset: 100 });
    
    // Then fetch events
    const events = await getRecentEvents(100);

    const eventCounts = {};
    events.forEach(e => {
      if (e.eventName && e.eventName !== 'Unknown') {
        eventCounts[e.eventName] = (eventCounts[e.eventName] || 0) + 1;
      }
    });

    const addresses = new Set();
    transactions.forEach(tx => addresses.add(tx.from.toLowerCase()));

    const result = {
      totalTransactions: transactions.length,
      totalEvents: events.length,
      uniqueAddresses: addresses.size,
      eventCounts,
      recentTransactions: transactions.slice(0, 10),
      recentEvents: events.slice(0, 10),
    };

    cache.set(cacheKey, result, 30000); // 30 second cache for stats
    return result;
  } catch (error) {
    console.error('Error fetching stats:', error);
    return {
      totalTransactions: 0,
      totalEvents: 0,
      uniqueAddresses: 0,
      eventCounts: {},
      recentTransactions: [],
      recentEvents: [],
    };
  }
}

/**
 * Query addresses and activities by date range
 */
export async function queryByDateRange(startDate, endDate) {
  try {
    // Convert dates to timestamps
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

    // Fetch transactions (they include timestamps)
    const allTransactions = await getContractTransactions({ offset: 500 });
    
    // Filter by date range
    const filteredTransactions = allTransactions.filter(tx => {
      const txTimestamp = Math.floor(new Date(tx.timestamp).getTime() / 1000);
      return txTimestamp >= startTimestamp && txTimestamp <= endTimestamp;
    });

    // Fetch events
    const allEvents = await getRecentEvents(500);
    
    // Filter events by date range
    const filteredEvents = allEvents.filter(event => {
      const eventTimestamp = Math.floor(new Date(event.timestamp).getTime() / 1000);
      return eventTimestamp >= startTimestamp && eventTimestamp <= endTimestamp;
    });

    // Build address activity map
    const addressMap = new Map();

    // Process transactions
    filteredTransactions.forEach(tx => {
      const addr = tx.from.toLowerCase();
      if (!addressMap.has(addr)) {
        addressMap.set(addr, {
          address: tx.from,
          transactions: [],
          events: [],
          functions: {},
          eventTypes: {},
          firstActivity: tx.timestamp,
          lastActivity: tx.timestamp,
        });
      }
      const entry = addressMap.get(addr);
      entry.transactions.push(tx);
      entry.functions[tx.functionName] = (entry.functions[tx.functionName] || 0) + 1;
      if (tx.timestamp < entry.firstActivity) entry.firstActivity = tx.timestamp;
      if (tx.timestamp > entry.lastActivity) entry.lastActivity = tx.timestamp;
    });

    // Process events
    filteredEvents.forEach(event => {
      const addresses = [];
      if (event.decoded?.from) addresses.push(event.decoded.from.toLowerCase());
      if (event.decoded?.to) addresses.push(event.decoded.to.toLowerCase());
      if (event.decoded?.src) addresses.push(event.decoded.src.toLowerCase());
      if (event.decoded?.dst) addresses.push(event.decoded.dst.toLowerCase());
      
      // Filter out zero address
      const validAddresses = addresses.filter(a => a !== '0x0000000000000000000000000000000000000000');
      
      validAddresses.forEach(addr => {
        if (!addressMap.has(addr)) {
          addressMap.set(addr, {
            address: addr,
            transactions: [],
            events: [],
            functions: {},
            eventTypes: {},
            firstActivity: event.timestamp,
            lastActivity: event.timestamp,
          });
        }
        const entry = addressMap.get(addr);
        entry.events.push(event);
        entry.eventTypes[event.eventName] = (entry.eventTypes[event.eventName] || 0) + 1;
        if (event.timestamp < entry.firstActivity) entry.firstActivity = event.timestamp;
        if (event.timestamp > entry.lastActivity) entry.lastActivity = event.timestamp;
      });
    });

    // Convert to array and add summary stats
    const results = Array.from(addressMap.values()).map(entry => ({
      address: entry.address,
      totalTransactions: entry.transactions.length,
      totalEvents: entry.events.length,
      totalActivity: entry.transactions.length + entry.events.length,
      functions: entry.functions,
      eventTypes: entry.eventTypes,
      firstActivity: entry.firstActivity,
      lastActivity: entry.lastActivity,
      transactions: entry.transactions.slice(0, 10), // Limit for response size
      events: entry.events.slice(0, 20), // Limit for response size
    }));

    // Sort by total activity
    results.sort((a, b) => b.totalActivity - a.totalActivity);

    return {
      startDate,
      endDate,
      totalAddresses: results.length,
      totalTransactions: filteredTransactions.length,
      totalEvents: filteredEvents.length,
      addresses: results,
    };
  } catch (error) {
    console.error('Error querying by date range:', error);
    throw error;
  }
}

export default {
  hasApiKey,
  getEventLogs,
  getRecentEvents,
  getEventsByType,
  getContractTransactions,
  getTransactionByHash,
  getUniqueAddresses,
  getAddressActivity,
  getContractStats,
  queryByDateRange,
  COMET_ADDRESS,
  EVENT_TOPICS,
};
