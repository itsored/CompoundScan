import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Clock, ExternalLink, RefreshCw } from 'lucide-react';
import { fetchApi } from '../hooks/useApi';
import { formatNumber, formatTimeAgo, truncateAddress } from '../utils/format';

function Addresses() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAddresses();
  }, []);

  async function fetchAddresses() {
    try {
      setLoading(true);
      // Use Etherscan API
      const result = await fetchApi('/etherscan/addresses?limit=100');
      setAddresses(result.data || []);
    } catch (err) {
      console.error('Failed to fetch addresses:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchAddresses();
    setRefreshing(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-comet-400" />
            Addresses
          </h1>
          <p className="text-dark-400 mt-1">All addresses that have interacted with Compound V3</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-800/50 border border-dark-700 text-dark-400 hover:text-comet-400 hover:border-comet-500/50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Addresses Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Address</th>
                <th>Transactions</th>
                <th>First Seen</th>
                <th>Last Active</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5}>
                      <div className="h-10 bg-dark-800/50 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : addresses.length > 0 ? (
                addresses.map((addr) => (
                  <tr key={addr.address}>
                    <td>
                      <Link to={`/address/${addr.address}`} className="address-link font-mono">
                        {truncateAddress(addr.address, 10, 8)}
                      </Link>
                    </td>
                    <td className="font-mono text-dark-300">
                      {formatNumber(addr.txCount)}
                    </td>
                    <td>
                      {addr.firstSeen ? (
                        <span className="text-dark-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(addr.firstSeen)}
                        </span>
                      ) : (
                        <span className="text-dark-500">-</span>
                      )}
                    </td>
                    <td>
                      {addr.lastSeen ? (
                        <span className="text-dark-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(addr.lastSeen)}
                        </span>
                      ) : (
                        <span className="text-dark-500">-</span>
                      )}
                    </td>
                    <td>
                      <a 
                        href={`https://sepolia.etherscan.io/address/${addr.address}`}
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
                  <td colSpan={5} className="text-center py-12 text-dark-500">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No addresses found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Info */}
        <div className="px-4 py-3 border-t border-dark-800 text-sm text-dark-400">
          Showing {addresses.length} addresses • Sorted by transaction count • Data from Etherscan API
        </div>
      </div>
    </div>
  );
}

export default Addresses;
