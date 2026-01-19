import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { fetchApi } from '../hooks/useApi';
import { formatNumber, formatTimeAgo, truncateAddress, truncateTxHash } from '../utils/format';

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const limit = 25;

  useEffect(() => {
    fetchTransactions();
  }, [page]);

  async function fetchTransactions() {
    try {
      setLoading(true);
      // Use Etherscan API
      const result = await fetchApi(`/etherscan/transactions?page=${page}&limit=${limit}`);
      setTransactions(result.data || []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
            <FileText className="w-7 h-7 text-comet-400" />
            Transactions
          </h1>
          <p className="text-dark-400 mt-1">All transactions interacting with Compound V3 contracts</p>
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

      {/* Transactions Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tx Hash</th>
                <th>Block</th>
                <th>From</th>
                <th>Function</th>
                <th>Status</th>
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
              ) : transactions.length > 0 ? (
                transactions.map((tx) => (
                  <tr key={tx.txHash}>
                    <td>
                      <Link to={`/tx/${tx.txHash}`} className="address-link font-mono">
                        {truncateTxHash(tx.txHash)}
                      </Link>
                    </td>
                    <td className="font-mono text-dark-300">
                      {formatNumber(tx.blockNumber)}
                    </td>
                    <td>
                      <Link to={`/address/${tx.from}`} className="address-link font-mono">
                        {truncateAddress(tx.from)}
                      </Link>
                    </td>
                    <td>
                      <span className="px-2 py-1 bg-dark-800 rounded text-xs font-mono text-dark-300">
                        {tx.functionName || 'Unknown'}
                      </span>
                    </td>
                    <td>
                      {!tx.isError ? (
                        <span className="flex items-center gap-1 text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs">Success</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400">
                          <XCircle className="w-4 h-4" />
                          <span className="text-xs">Failed</span>
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="text-dark-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(tx.timestamp)}
                      </span>
                    </td>
                    <td>
                      <a 
                        href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
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
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No transactions found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-dark-800">
          <div className="text-sm text-dark-400">
            Showing {transactions.length} transactions • Data from Etherscan API
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-dark-700 text-dark-400 hover:text-white hover:border-dark-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-dark-300 px-3">
              Page {page}
            </span>
            <button
              onClick={() => setPage(prev => prev + 1)}
              disabled={transactions.length < limit}
              className="p-2 rounded-lg border border-dark-700 text-dark-400 hover:text-white hover:border-dark-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Transactions;
