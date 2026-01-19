import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  FileText, 
  Copy, 
  ExternalLink, 
  Clock, 
  CheckCircle,
  XCircle,
  Box,
  ArrowRight,
  Code,
  Check
} from 'lucide-react';
import { fetchApi } from '../hooks/useApi';
import { 
  formatNumber, 
  formatDateTime,
  truncateAddress,
  getEventBadgeClass,
  copyToClipboard 
} from '../utils/format';

function TransactionDetail() {
  const { txHash } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchTxData();
  }, [txHash]);

  async function fetchTxData() {
    try {
      setLoading(true);
      // Try to get transaction data
      const result = await fetchApi(`/transactions/${txHash}`);
      setData(result.data);
    } catch (err) {
      // If not found in transactions, try to get events
      try {
        const eventsResult = await fetchApi(`/events/tx/${txHash}`);
        setData({ events: eventsResult.data });
      } catch {
        console.error('Failed to fetch transaction:', err);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    await copyToClipboard(txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-48 bg-dark-800/50 rounded-2xl animate-pulse" />
        <div className="h-64 bg-dark-800/50 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Transaction Hash</p>
              <div className="flex items-center gap-2 mt-1">
                <h1 className="text-lg font-mono text-white">
                  {truncateAddress(txHash, 16, 14)}
                </h1>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
                  title="Copy hash"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-comet-400 transition-colors"
                  title="View on Etherscan"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {data?.status !== undefined && (
            <div>
              {data.status === 1 ? (
                <span className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30">
                  <CheckCircle className="w-5 h-5" />
                  Success
                </span>
              ) : (
                <span className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30">
                  <XCircle className="w-5 h-5" />
                  Failed
                </span>
              )}
            </div>
          )}
        </div>

        {/* Transaction Details */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-dark-800">
            {data.block_number && (
              <div>
                <p className="text-dark-400 text-sm mb-1">Block</p>
                <p className="text-white flex items-center gap-2">
                  <Box className="w-4 h-4 text-dark-500" />
                  <span className="font-mono">{formatNumber(data.block_number)}</span>
                </p>
              </div>
            )}

            {data.timestamp && (
              <div>
                <p className="text-dark-400 text-sm mb-1">Timestamp</p>
                <p className="text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-dark-500" />
                  {formatDateTime(data.timestamp)}
                </p>
              </div>
            )}

            {data.from_address && (
              <div>
                <p className="text-dark-400 text-sm mb-1">From</p>
                <Link to={`/address/${data.from_address}`} className="address-link font-mono">
                  {data.from_address}
                </Link>
              </div>
            )}

            {data.to_address && (
              <div>
                <p className="text-dark-400 text-sm mb-1">To</p>
                <Link to={`/address/${data.to_address}`} className="address-link font-mono">
                  {data.to_address}
                </Link>
              </div>
            )}

            {data.function_name && (
              <div>
                <p className="text-dark-400 text-sm mb-1">Function</p>
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-dark-500" />
                  <span className="px-2 py-1 bg-dark-800 rounded font-mono text-sm text-comet-400">
                    {data.function_name}
                  </span>
                </div>
              </div>
            )}

            {data.gas_used && (
              <div>
                <p className="text-dark-400 text-sm mb-1">Gas Used</p>
                <p className="text-white font-mono">{formatNumber(data.gas_used)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transaction Flow */}
      {data?.from_address && data?.to_address && (
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-display font-semibold text-white mb-4">Transaction Flow</h2>
          <div className="flex items-center justify-center gap-4 py-6">
            <div className="text-center">
              <p className="text-dark-400 text-sm mb-2">From</p>
              <Link 
                to={`/address/${data.from_address}`}
                className="block p-4 bg-dark-800/50 rounded-xl hover:bg-dark-800 transition-colors"
              >
                <span className="address-link font-mono text-sm">
                  {truncateAddress(data.from_address)}
                </span>
              </Link>
            </div>
            <ArrowRight className="w-8 h-8 text-comet-400" />
            <div className="text-center">
              <p className="text-dark-400 text-sm mb-2">Contract</p>
              <Link 
                to={`/address/${data.to_address}`}
                className="block p-4 bg-comet-500/10 border border-comet-500/30 rounded-xl hover:bg-comet-500/20 transition-colors"
              >
                <span className="text-comet-400 font-mono text-sm">
                  {data.contract_name || truncateAddress(data.to_address)}
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Events */}
      {data?.events && data.events.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-display font-semibold text-white mb-4">
            Events ({data.events.length})
          </h2>
          <div className="space-y-3">
            {data.events.map((event, i) => (
              <div 
                key={i} 
                className="p-4 bg-dark-800/30 rounded-xl border border-dark-700/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`event-badge ${getEventBadgeClass(event.event_name)}`}>
                    {event.event_name}
                  </span>
                  <span className="text-dark-500 text-sm">
                    Log Index: {event.log_index}
                  </span>
                </div>
                
                {event.decoded_data && (
                  <div className="bg-dark-900/50 rounded-lg p-3 font-mono text-sm overflow-x-auto">
                    <pre className="text-dark-300 whitespace-pre-wrap">
                      {JSON.stringify(
                        typeof event.decoded_data === 'string' 
                          ? JSON.parse(event.decoded_data) 
                          : event.decoded_data, 
                        null, 
                        2
                      )}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Data */}
      {data?.input_data && data.input_data !== '0x' && (
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-display font-semibold text-white mb-4">Input Data</h2>
          <div className="bg-dark-900/50 rounded-lg p-4 font-mono text-sm overflow-x-auto">
            <code className="text-dark-300 break-all">{data.input_data}</code>
          </div>
          
          {data.decoded_input && (
            <div className="mt-4 pt-4 border-t border-dark-800">
              <h3 className="text-dark-400 text-sm mb-2">Decoded Input</h3>
              <div className="bg-dark-900/50 rounded-lg p-3 font-mono text-sm overflow-x-auto">
                <pre className="text-dark-300 whitespace-pre-wrap">
                  {JSON.stringify(
                    typeof data.decoded_input === 'string' 
                      ? JSON.parse(data.decoded_input) 
                      : data.decoded_input, 
                    null, 
                    2
                  )}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TransactionDetail;

