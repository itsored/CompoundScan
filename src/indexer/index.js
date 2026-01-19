import { ethers } from 'ethers';
import db from '../db/index.js';
import { config } from '../config/index.js';
import { COMET_CONTRACTS, getTrackableContracts } from '../config/contracts.js';
import { getProvider, getCurrentBlock, getBlock, getLogs, parseEventLog } from './provider.js';
import { eventHandlers } from './eventHandlers.js';
import { logger } from '../utils/logger.js';
import CometABI from '../config/abi/CometABI.json' assert { type: 'json' };
import CometRewardsABI from '../config/abi/CometRewardsABI.json' assert { type: 'json' };

// Combined ABI for all events
const COMBINED_ABI = [...CometABI, ...CometRewardsABI];

/**
 * Main Indexer Class for Compound V3 (Comet) Protocol
 */
export class CometIndexer {
  constructor(network = 'ETHEREUM_MAINNET') {
    this.network = network;
    this.networkId = null;
    this.contracts = [];
    this.isRunning = false;
    this.batchSize = config.indexer.batchSize;
    this.pollInterval = config.indexer.pollInterval;
  }

  /**
   * Initialize the indexer
   */
  async initialize() {
    logger.info(`Initializing Comet Indexer for ${this.network}`);

    // Check database connection
    const connected = await db.checkConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Get or create network record
    const networkConfig = this.network === 'SEPOLIA' 
      ? { chainId: 11155111, name: 'Ethereum Sepolia' }
      : { chainId: 1, name: 'Ethereum Mainnet' };

    const networkResult = await db.query(
      'SELECT id FROM networks WHERE chain_id = $1',
      [networkConfig.chainId]
    );

    if (networkResult.rows.length === 0) {
      throw new Error(`Network ${this.network} not found in database. Run migrations first.`);
    }

    this.networkId = networkResult.rows[0].id;

    // Load contracts to track
    await this.loadContracts();

    logger.info(`Indexer initialized with ${this.contracts.length} contracts to track`);
  }

  /**
   * Load contracts from config into database
   */
  async loadContracts() {
    const trackableContracts = getTrackableContracts(this.network);

    for (const contract of trackableContracts) {
      if (contract.address === '0x0000000000000000000000000000000000000000') {
        continue; // Skip placeholder addresses
      }

      // Upsert contract
      const result = await db.query(
        `INSERT INTO contracts 
         (address, network_id, name, contract_type, deploy_block, is_proxy, base_token_address, base_token_symbol, base_token_decimals)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (address, network_id) 
         DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [
          contract.address,
          this.networkId,
          contract.name,
          contract.type,
          contract.deployBlock || 0,
          contract.type === 'market',
          contract.baseToken?.address || null,
          contract.baseToken?.symbol || null,
          contract.baseToken?.decimals || null,
        ]
      );

      this.contracts.push({
        ...contract,
        id: result.rows[0].id,
      });
    }
  }

  /**
   * Get the last indexed block for a contract
   */
  async getLastIndexedBlock(contractId) {
    const result = await db.query(
      `SELECT last_indexed_block FROM indexer_state 
       WHERE network_id = $1 AND contract_id = $2`,
      [this.networkId, contractId]
    );

    if (result.rows.length === 0) {
      return config.indexer.startBlock;
    }

    return result.rows[0].last_indexed_block;
  }

  /**
   * Update the last indexed block
   */
  async updateLastIndexedBlock(contractId, blockNumber) {
    await db.query(
      `INSERT INTO indexer_state (network_id, contract_id, last_indexed_block, last_indexed_at, status)
       VALUES ($1, $2, $3, NOW(), 'running')
       ON CONFLICT (network_id, contract_id)
       DO UPDATE SET last_indexed_block = $3, last_indexed_at = NOW(), status = 'running'`,
      [this.networkId, contractId, blockNumber]
    );
  }

  /**
   * Index a range of blocks for all contracts
   */
  async indexBlockRange(fromBlock, toBlock) {
    logger.info(`Indexing blocks ${fromBlock} to ${toBlock}`);

    for (const contract of this.contracts) {
      if (contract.type !== 'market') continue; // Focus on market contracts first

      try {
        await this.indexContractEvents(contract, fromBlock, toBlock);
      } catch (error) {
        logger.error(`Error indexing contract ${contract.name}`, { error: error.message });
      }
    }
  }

  /**
   * Index events for a specific contract
   */
  async indexContractEvents(contract, fromBlock, toBlock) {
    const provider = getProvider();

    // Fetch all logs for this contract
    const logs = await getLogs({
      address: contract.address,
      fromBlock,
      toBlock,
    });

    if (logs.length === 0) {
      logger.debug(`No events found for ${contract.name} in blocks ${fromBlock}-${toBlock}`);
      return;
    }

    logger.info(`Found ${logs.length} events for ${contract.name}`);

    // Get unique blocks for timestamps
    const blockNumbers = [...new Set(logs.map(log => log.blockNumber))];
    const blockTimestamps = {};

    for (const blockNum of blockNumbers) {
      const block = await getBlock(blockNum, false);
      if (block) {
        blockTimestamps[blockNum] = new Date(Number(block.timestamp) * 1000);
      }
    }

    // Process each log
    for (const log of logs) {
      await this.processLog(log, contract, blockTimestamps[log.blockNumber]);
    }

    // Update indexer state
    await this.updateLastIndexedBlock(contract.id, toBlock);
  }

  /**
   * Process a single log/event
   */
  async processLog(log, contract, timestamp) {
    // Parse the event
    const parsed = parseEventLog(log, COMBINED_ABI);
    if (!parsed) {
      logger.debug('Could not parse log', { transactionHash: log.transactionHash });
      return;
    }

    // Store the raw event
    const eventResult = await db.query(
      `INSERT INTO events 
       (network_id, tx_hash, block_number, log_index, contract_id, contract_address, 
        event_name, event_signature, topic0, topic1, topic2, topic3, raw_data, decoded_data, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (network_id, tx_hash, log_index) DO NOTHING
       RETURNING id`,
      [
        this.networkId,
        log.transactionHash,
        log.blockNumber,
        log.index,
        contract.id,
        log.address.toLowerCase(),
        parsed.name,
        parsed.signature,
        log.topics[0] || null,
        log.topics[1] || null,
        log.topics[2] || null,
        log.topics[3] || null,
        log.data,
        JSON.stringify(parsed.args),
        timestamp,
      ]
    );

    if (eventResult.rows.length === 0) {
      return; // Already indexed
    }

    const eventId = eventResult.rows[0].id;

    // Convert parsed args to decoded object
    const decoded = {};
    for (const arg of parsed.args) {
      decoded[arg.name] = arg.value;
    }

    // Call specific event handler
    const handler = eventHandlers[parsed.name];
    if (handler) {
      await handler(
        {
          id: eventId,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          decoded,
        },
        this.networkId,
        contract.id,
        timestamp
      );
    }

    // Track addresses
    await this.trackAddresses(decoded, log.blockNumber, timestamp);
  }

  /**
   * Track addresses that appear in events
   */
  async trackAddresses(decoded, blockNumber, timestamp) {
    const addressFields = ['from', 'to', 'dst', 'src', 'absorber', 'borrower', 'buyer', 'recipient', 'owner', 'manager'];

    for (const field of addressFields) {
      if (decoded[field] && ethers.isAddress(decoded[field])) {
        const address = decoded[field].toLowerCase();

        await db.query(
          `INSERT INTO addresses (address, first_seen_block, first_seen_at, last_seen_block, last_seen_at, transaction_count)
           VALUES ($1, $2, $3, $2, $3, 1)
           ON CONFLICT (address) 
           DO UPDATE SET 
             last_seen_block = GREATEST(addresses.last_seen_block, $2),
             last_seen_at = GREATEST(addresses.last_seen_at, $3),
             transaction_count = addresses.transaction_count + 1`,
          [address, blockNumber, timestamp]
        );
      }
    }
  }

  /**
   * Start the indexer
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Indexer is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting Comet Indexer...');

    await this.initialize();

    // Main indexing loop
    while (this.isRunning) {
      try {
        const currentBlock = await getCurrentBlock();

        for (const contract of this.contracts) {
          if (contract.type !== 'market') continue;

          const lastIndexed = await this.getLastIndexedBlock(contract.id);
          const startBlock = Math.max(lastIndexed + 1, contract.deployBlock || 0);

          if (startBlock >= currentBlock) {
            continue; // Up to date
          }

          // Index in batches
          let fromBlock = startBlock;
          while (fromBlock < currentBlock) {
            const toBlock = Math.min(fromBlock + this.batchSize - 1, currentBlock);
            await this.indexBlockRange(fromBlock, toBlock);
            fromBlock = toBlock + 1;
          }
        }

        logger.info(`Indexed up to block ${currentBlock}. Waiting for new blocks...`);
        await this.sleep(this.pollInterval);
      } catch (error) {
        logger.error('Indexer error', { error: error.message });
        await this.sleep(5000); // Wait before retrying
      }
    }
  }

  /**
   * Stop the indexer
   */
  stop() {
    logger.info('Stopping Comet Indexer...');
    this.isRunning = false;
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// CLI runner
if (process.argv[1].includes('indexer/index.js')) {
  const network = process.argv[2]?.toUpperCase() || 'ETHEREUM_MAINNET';
  const indexer = new CometIndexer(network);

  process.on('SIGINT', () => {
    indexer.stop();
    process.exit(0);
  });

  indexer.start().catch((error) => {
    logger.error('Fatal indexer error', error);
    process.exit(1);
  });
}

export default CometIndexer;

