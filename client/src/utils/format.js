/**
 * Truncate an address for display
 */
export function truncateAddress(address, startLength = 6, endLength = 4) {
  if (!address || address.length < startLength + endLength + 3) return address;
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

/**
 * Truncate a transaction hash for display
 */
export function truncateTxHash(hash, length = 10) {
  if (!hash || hash.length < length * 2 + 3) return hash;
  return `${hash.slice(0, length)}...${hash.slice(-length)}`;
}

/**
 * Format a number with commas
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString();
}

/**
 * Format a large number with K, M, B suffixes
 */
export function formatLargeNumber(num, decimals = 2) {
  if (num === null || num === undefined) return '0';
  const n = Number(num);
  if (n >= 1e9) return (n / 1e9).toFixed(decimals) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(decimals) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(decimals) + 'K';
  return n.toFixed(decimals);
}

/**
 * Format wei to human readable
 */
export function formatWei(value, decimals = 18) {
  if (!value) return '0';
  const num = BigInt(value);
  const divisor = BigInt(10 ** decimals);
  const integerPart = num / divisor;
  const fractionalPart = num % divisor;
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0').slice(0, 4);
  return `${integerPart}.${fractionalStr}`;
}

/**
 * Format a timestamp to relative time
 */
export function formatTimeAgo(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

/**
 * Format a timestamp to full date/time
 */
export function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 * Get event badge class based on event name
 */
export function getEventBadgeClass(eventName) {
  const name = eventName?.toLowerCase() || '';
  if (name.includes('supply')) return 'event-supply';
  if (name.includes('withdraw') || name.includes('borrow')) return 'event-withdraw';
  if (name.includes('absorb') || name.includes('liquidat')) return 'event-liquidation';
  if (name.includes('reward') || name.includes('claim')) return 'event-reward';
  if (name.includes('transfer')) return 'event-transfer';
  return 'bg-dark-700 text-dark-300';
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default {
  truncateAddress,
  truncateTxHash,
  formatNumber,
  formatLargeNumber,
  formatWei,
  formatTimeAgo,
  formatDateTime,
  getEventBadgeClass,
  copyToClipboard,
};

