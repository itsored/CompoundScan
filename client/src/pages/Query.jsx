import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Calendar, 
  Users, 
  Activity, 
  FileText, 
  Clock, 
  ExternalLink,
  Download,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { fetchApi } from '../hooks/useApi';
import { formatNumber, formatTimeAgo, truncateAddress, truncateTxHash, getEventBadgeClass } from '../utils/format';

function Query() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expandedAddress, setExpandedAddress] = useState(null);

  // Set default dates (last 30 days)
  useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  });

  async function handleQuery() {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const data = await fetchApi(`/etherscan/query?startDate=${startDate}&endDate=${endDate}`);
      setResult(data.data);
    } catch (err) {
      setError(err.message || 'Failed to query data');
    } finally {
      setLoading(false);
    }
  }

  function exportToCSV() {
    if (!result?.addresses) return;

    const headers = ['Address', 'Total Transactions', 'Total Events', 'Functions Called', 'Event Types', 'First Activity', 'Last Activity'];
    const rows = result.addresses.map(addr => [
      addr.address,
      addr.totalTransactions,
      addr.totalEvents,
      Object.entries(addr.functions || {}).map(([k, v]) => `${k}(${v})`).join('; '),
      Object.entries(addr.eventTypes || {}).map(([k, v]) => `${k}(${v})`).join('; '),
      addr.firstActivity,
      addr.lastActivity,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compound-query-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
          <Search className="w-7 h-7 text-comet-400" />
          Query Explorer
        </h1>
        <p className="text-dark-400 mt-1">
          Query addresses and their activities within a specific date range
        </p>
      </div>

      {/* Query Form */}
      <div className="glass rounded-2xl p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm text-dark-400 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 bg-dark-800/50 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-comet-500/50 transition-colors"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-dark-400 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 bg-dark-800/50 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-comet-500/50 transition-colors"
            />
          </div>
          <button
            onClick={handleQuery}
            disabled={loading}
            className="px-8 py-3 bg-gradient-to-r from-comet-500 to-comet-600 text-white font-semibold rounded-xl hover:from-comet-400 hover:to-comet-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Querying...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Query
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 text-dark-400 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Date Range</span>
              </div>
              <p className="text-lg font-bold text-white">
                {new Date(result.startDate).toLocaleDateString()} - {new Date(result.endDate).toLocaleDateString()}
              </p>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 text-comet-400 mb-2">
                <Users className="w-4 h-4" />
                <span className="text-sm">Unique Addresses</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {formatNumber(result.totalAddresses)}
              </p>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <FileText className="w-4 h-4" />
                <span className="text-sm">Transactions</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {formatNumber(result.totalTransactions)}
              </p>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-sm">Events</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {formatNumber(result.totalEvents)}
              </p>
            </div>
          </div>

          {/* Export Button */}
          {result.addresses?.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-dark-800/50 border border-dark-700 rounded-lg text-dark-300 hover:text-white hover:border-dark-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          )}

          {/* Address List */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-dark-800">
              <h2 className="text-lg font-semibold text-white">
                Addresses ({result.addresses?.length || 0})
              </h2>
            </div>

            {result.addresses?.length > 0 ? (
              <div className="divide-y divide-dark-800">
                {result.addresses.map((addr, idx) => (
                  <AddressCard
                    key={addr.address}
                    address={addr}
                    isExpanded={expandedAddress === idx}
                    onToggle={() => setExpandedAddress(expandedAddress === idx ? null : idx)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-dark-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No addresses found in this date range</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AddressCard({ address, isExpanded, onToggle }) {
  return (
    <div className="p-4">
      {/* Header */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-comet-500/20 to-comet-700/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-comet-400" />
          </div>
          <div>
            <Link 
              to={`/address/${address.address}`}
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-white hover:text-comet-400 transition-colors"
            >
              {truncateAddress(address.address, 10, 8)}
            </Link>
            <div className="flex items-center gap-3 mt-1 text-sm text-dark-400">
              <span>{address.totalTransactions} txs</span>
              <span>•</span>
              <span>{address.totalEvents} events</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Function badges */}
          <div className="hidden md:flex gap-2">
            {Object.entries(address.functions || {}).slice(0, 3).map(([fn, count]) => (
              <span 
                key={fn} 
                className="px-2 py-1 bg-dark-800 rounded text-xs font-mono text-dark-300"
              >
                {fn} ({count})
              </span>
            ))}
          </div>
          
          {/* Expand toggle */}
          <button className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 transition-colors">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-4 pl-14 space-y-4">
          {/* Activity summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-dark-800/30 rounded-lg p-3">
              <p className="text-xs text-dark-400">First Activity</p>
              <p className="text-sm text-white mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimeAgo(address.firstActivity)}
              </p>
            </div>
            <div className="bg-dark-800/30 rounded-lg p-3">
              <p className="text-xs text-dark-400">Last Activity</p>
              <p className="text-sm text-white mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimeAgo(address.lastActivity)}
              </p>
            </div>
            <div className="bg-dark-800/30 rounded-lg p-3">
              <p className="text-xs text-dark-400">Functions Called</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(address.functions || {}).map(([fn, count]) => (
                  <span key={fn} className="text-xs text-comet-400">
                    {fn}({count})
                  </span>
                ))}
                {Object.keys(address.functions || {}).length === 0 && (
                  <span className="text-xs text-dark-500">-</span>
                )}
              </div>
            </div>
            <div className="bg-dark-800/30 rounded-lg p-3">
              <p className="text-xs text-dark-400">Event Types</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(address.eventTypes || {}).map(([type, count]) => (
                  <span key={type} className={`text-xs ${getEventBadgeClass(type).replace('event-badge', '')} px-1 rounded`}>
                    {type}({count})
                  </span>
                ))}
                {Object.keys(address.eventTypes || {}).length === 0 && (
                  <span className="text-xs text-dark-500">-</span>
                )}
              </div>
            </div>
          </div>

          {/* Recent transactions */}
          {address.transactions?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-dark-400 mb-2">Recent Transactions</h4>
              <div className="space-y-1">
                {address.transactions.slice(0, 5).map((tx, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-3 bg-dark-800/20 rounded-lg text-sm">
                    <span className="px-2 py-0.5 bg-dark-700 rounded text-xs font-mono text-dark-300">
                      {tx.functionName}
                    </span>
                    <Link to={`/tx/${tx.txHash}`} className="font-mono text-dark-400 hover:text-comet-400 transition-colors">
                      {truncateTxHash(tx.txHash)}
                    </Link>
                    <span className="text-dark-500 text-xs ml-auto">
                      {formatTimeAgo(tx.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent events */}
          {address.events?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-dark-400 mb-2">Recent Events</h4>
              <div className="space-y-1">
                {address.events.slice(0, 5).map((event, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-3 bg-dark-800/20 rounded-lg text-sm">
                    <span className={`event-badge ${getEventBadgeClass(event.eventName)}`}>
                      {event.eventName}
                    </span>
                    <Link to={`/tx/${event.txHash}`} className="font-mono text-dark-400 hover:text-comet-400 transition-colors">
                      {truncateTxHash(event.txHash)}
                    </Link>
                    <span className="text-dark-500 text-xs ml-auto">
                      {formatTimeAgo(event.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View full profile link */}
          <div className="flex justify-end">
            <Link
              to={`/address/${address.address}`}
              className="flex items-center gap-2 text-sm text-comet-400 hover:text-comet-300 transition-colors"
            >
              View full profile
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default Query;

