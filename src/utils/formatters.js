import { ethers } from 'ethers';

/**
 * Format a wei value to a human readable string
 */
export function formatWei(value, decimals = 18) {
  return ethers.formatUnits(value, decimals);
}

/**
 * Parse a human readable value to wei
 */
export function parseToWei(value, decimals = 18) {
  return ethers.parseUnits(value.toString(), decimals);
}

/**
 * Truncate an address for display
 */
export function truncateAddress(address, startLength = 6, endLength = 4) {
  if (!address || address.length < startLength + endLength) return address;
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

/**
 * Format a timestamp to ISO string
 */
export function formatTimestamp(timestamp) {
  if (typeof timestamp === 'number') {
    return new Date(timestamp * 1000).toISOString();
  }
  return new Date(timestamp).toISOString();
}

/**
 * Format a block number with commas
 */
export function formatBlockNumber(blockNumber) {
  return blockNumber.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value, total, decimals = 2) {
  if (total === 0n || total === 0) return '0';
  const percentage = (Number(value) / Number(total)) * 100;
  return percentage.toFixed(decimals);
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatLargeNumber(value, decimals = 2) {
  const num = Number(value);
  if (num >= 1e9) return (num / 1e9).toFixed(decimals) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(decimals) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(decimals) + 'K';
  return num.toFixed(decimals);
}

/**
 * Get function selector from signature
 */
export function getFunctionSelector(signature) {
  return ethers.id(signature).slice(0, 10);
}

/**
 * Get event topic from signature
 */
export function getEventTopic(signature) {
  return ethers.id(signature);
}

export default {
  formatWei,
  parseToWei,
  truncateAddress,
  formatTimestamp,
  formatBlockNumber,
  calculatePercentage,
  formatLargeNumber,
  getFunctionSelector,
  getEventTopic,
};

