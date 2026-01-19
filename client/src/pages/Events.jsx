import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Filter, ChevronLeft, ChevronRight, Clock, ExternalLink, RefreshCw } from 'lucide-react';
import { fetchApi } from '../hooks/useApi';
import { formatNumber, formatTimeAgo, truncateAddress, truncateTxHash, getEventBadgeClass } from '../utils/format';

const EVENT_TYPES = ['Supply', 'Withdraw', 'SupplyCollateral', 'WithdrawCollateral', 'Transfer', 'AbsorbCollateral'];

function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ event_name: '' });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [filters.event_name]);

  async function fetchEvents() {
    try {
      setLoading(true);
      const limit = 100;
      
      // Use Etherscan API
      let endpoint = `/etherscan/events?limit=${limit}`;
      if (filters.event_name) {
        endpoint += `&type=${filters.event_name}`;
      }

      const result = await fetchApi(endpoint);
      setEvents(result.data || []);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  }

  // Format amount for display
  function formatAmount(amount) {
    if (!amount || amount === '0') return '-';
    const num = BigInt(amount);
    // Convert from wei (18 decimals)
    const eth = Number(num) / 1e18;
    if (eth < 0.0001) return '<0.0001 ETH';
    return `${eth.toFixed(4)} ETH`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
            <Activity className="w-7 h-7 text-comet-400" />
            Protocol Events
          </h1>
          <p className="text-dark-400 mt-1">All decoded events from Compound V3 contracts</p>
        </div>

        {/* Filter & Refresh */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg bg-dark-800/50 border border-dark-700 text-dark-400 hover:text-comet-400 hover:border-comet-500/50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <select
              value={filters.event_name}
              onChange={(e) => setFilters({ ...filters, event_name: e.target.value })}
              className="pl-10 pr-8 py-2 bg-dark-800/50 border border-dark-700 rounded-lg text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-comet-500/50"
            >
              <option value="">All Events</option>
              {EVENT_TYPES.map((et) => (
                <option key={et} value={et}>
                  {et}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Transaction</th>
                <th>Block</th>
                <th>From</th>
                <th>Amount</th>
                <th>Time</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7}>
                      <div className="h-10 bg-dark-800/50 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : events.length > 0 ? (
                events.map((event, idx) => (
                  <tr key={`${event.txHash}-${event.logIndex}-${idx}`}>
                    <td>
                      <span className={`event-badge ${getEventBadgeClass(event.eventName)}`}>
                        {event.eventName}
                      </span>
                    </td>
                    <td>
                      <Link to={`/tx/${event.txHash}`} className="address-link font-mono">
                        {truncateTxHash(event.txHash)}
                      </Link>
                    </td>
                    <td className="font-mono text-dark-300">
                      {formatNumber(event.blockNumber)}
                    </td>
                    <td>
                      {event.decoded?.from || event.decoded?.src ? (
                        <Link 
                          to={`/address/${event.decoded.from || event.decoded.src}`} 
                          className="address-link font-mono"
                        >
                          {truncateAddress(event.decoded.from || event.decoded.src)}
                        </Link>
                      ) : (
                        <span className="text-dark-500">-</span>
                      )}
                    </td>
                    <td className="font-mono text-dark-300">
                      {formatAmount(event.decoded?.amount)}
                    </td>
                    <td>
                      <span className="text-dark-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(event.timestamp)}
                      </span>
                    </td>
                    <td>
                      <a 
                        href={`https://sepolia.etherscan.io/tx/${event.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-comet-400 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-dark-500">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No events found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Info */}
        <div className="px-4 py-3 border-t border-dark-800 text-sm text-dark-400">
          Showing {events.length} most recent events • Data from Etherscan API
        </div>
      </div>
    </div>
  );
}

export default Events;
