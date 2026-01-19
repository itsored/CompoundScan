import { ethers } from 'ethers';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let provider = null;

/**
 * Get or create the Ethereum provider
 */
export function getProvider(network = 'sepolia') {
  if (provider) return provider;

  const rpcUrl = config.rpc[network];
  if (!rpcUrl) {
    throw new Error(`No RPC URL configured for network: ${network}`);
  }

  logger.info(`Connecting to ${network} via ${rpcUrl}`);
  provider = new ethers.JsonRpcProvider(rpcUrl);

  return provider;
}

/**
 * Get current block number
 */
export async function getCurrentBlock() {
  const prov = getProvider();
  return await prov.getBlockNumber();
}

/**
 * Get block with transactions
 */
export async function getBlock(blockNumber, includeTransactions = true) {
  const prov = getProvider();
  return await prov.getBlock(blockNumber, includeTransactions);
}

/**
 * Get transaction receipt
 */
export async function getTransactionReceipt(txHash) {
  const prov = getProvider();
  return await prov.getTransactionReceipt(txHash);
}

/**
 * Get logs for a filter
 */
export async function getLogs(filter) {
  const prov = getProvider();
  return await prov.getLogs(filter);
}

/**
 * Get contract instance
 */
export function getContract(address, abi) {
  const prov = getProvider();
  return new ethers.Contract(address, abi, prov);
}

/**
 * Parse transaction input data
 */
export function parseTransactionInput(data, abi) {
  try {
    const iface = new ethers.Interface(abi);
    const parsed = iface.parseTransaction({ data });
    if (!parsed) return null;

    return {
      name: parsed.name,
      signature: parsed.signature,
      selector: parsed.selector,
      args: parsed.args.map((arg, i) => ({
        name: parsed.fragment.inputs[i]?.name || `arg${i}`,
        type: parsed.fragment.inputs[i]?.type || 'unknown',
        value: arg.toString(),
      })),
    };
  } catch (error) {
    return null;
  }
}

/**
 * Parse event log
 */
export function parseEventLog(log, abi) {
  try {
    const iface = new ethers.Interface(abi);
    const parsed = iface.parseLog({
      topics: log.topics,
      data: log.data,
    });
    if (!parsed) return null;

    return {
      name: parsed.name,
      signature: parsed.signature,
      topic: parsed.topic,
      args: parsed.args.map((arg, i) => ({
        name: parsed.fragment.inputs[i]?.name || `arg${i}`,
        type: parsed.fragment.inputs[i]?.type || 'unknown',
        indexed: parsed.fragment.inputs[i]?.indexed || false,
        value: arg.toString(),
      })),
    };
  } catch (error) {
    return null;
  }
}

/**
 * Create event filter for a contract
 */
export function createEventFilter(contractAddress, eventName, abi, fromBlock, toBlock) {
  const iface = new ethers.Interface(abi);
  const eventFragment = iface.getEvent(eventName);
  if (!eventFragment) return null;

  return {
    address: contractAddress,
    topics: [iface.getEventTopic(eventFragment)],
    fromBlock,
    toBlock,
  };
}

export default {
  getProvider,
  getCurrentBlock,
  getBlock,
  getTransactionReceipt,
  getLogs,
  getContract,
  parseTransactionInput,
  parseEventLog,
  createEventFilter,
};

