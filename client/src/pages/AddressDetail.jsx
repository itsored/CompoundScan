import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  User, 
  Copy, 
  ExternalLink, 
  Clock, 
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Check
} from 'lucide-react';
import { fetchApi } from '../hooks/useApi';
import { 
  formatNumber, 
  formatTimeAgo, 
  truncateAddress, 
  truncateTxHash,
  getEventBadgeClass,
  copyToClipboard 
} from '../utils/format';

function AddressDetail() {
  const { address } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAddressData();
  }, [address]);

  async function fetchAddressData() {
    try {
      setLoading(true);
      // Use Etherscan API
      const result = await fetchApi(`/etherscan/address/${address}`);
      setData(result.data);
    } catch (err) {
      console.error('Failed to fetch address:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchAddressData();
    setRefreshing(false);
  }

  async function handleCopy() {
    await copyToClipboard(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Format amount for display
  function formatAmount(amount) {
    if (!amount || amount === '0') return '-';
    try {
      const num = BigInt(amount);
      // Convert from wei (18 decimals)
      const eth = Number(num) / 1e18;
      if (eth < 0.0001) return '<0.0001 ETH';
      return `${eth.toFixed(4)} ETH`;
    } catch {
      return '-';
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-dark-800/50 rounded-2xl animate-pulse" />
        <div className="h-64 bg-dark-800/50 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const tabs = [
    { id: 'all', label: 'All Events', count: data?.totalEvents || 0 },
    { id: 'supplies', label: 'Supplies', count: data?.supplies?.length || 0 },
    { id: 'withdraws', label: 'Withdraws', count: data?.withdraws?.length || 0 },
    { id: 'liquidations', label: 'Liquidations', count: data?.liquidations?.length || 0 },
    { id: 'transfers', label: 'Transfers', count: data?.transfers?.length || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-comet-500 to-comet-700 flex items-center justify-center">
              <User className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Address</p>
              <div className="flex items-center gap-2 mt-1">
                <h1 className="text-xl font-mono text-white">
                  {truncateAddress(address, 12, 10)}
                </h1>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
                  title="Copy address"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={`https://sepolia.etherscan.io/address/${address}`}
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

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-800/50 border border-dark-700 text-dark-400 hover:text-comet-400 hover:border-comet-500/50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-dark-800">
          <div>
            <p className="text-dark-400 text-sm">Total Events</p>
            <p className="text-2xl font-bold gradient-text mt-1">
              {formatNumber(data?.totalEvents || 0)}
            </p>
          </div>
          <div>
            <p className="text-dark-400 text-sm flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-400" />
              Supplies
            </p>
            <p className="text-2xl font-bold text-green-400 mt-1">
              {data?.supplies?.length || 0}
            </p>
          </div>
          <div>
            <p className="text-dark-400 text-sm flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-orange-400" />
              Withdraws
            </p>
            <p className="text-2xl font-bold text-orange-400 mt-1">
              {data?.withdraws?.length || 0}
            </p>
          </div>
          <div>
            <p className="text-dark-400 text-sm flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              Liquidations
            </p>
            <p className="text-2xl font-bold text-red-400 mt-1">
              {data?.liquidations?.length || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Activity Tabs */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex border-b border-dark-800 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'text-comet-400 border-b-2 border-comet-400 bg-comet-500/10'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              {tab.label}
              <span className="ml-2 px-2 py-0.5 bg-dark-800 rounded-full text-xs">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="p-4">
          {activeTab === 'all' && (
            <EventList events={data?.events || []} formatAmount={formatAmount} />
          )}
          {activeTab === 'supplies' && (
            <EventList events={data?.supplies || []} formatAmount={formatAmount} />
          )}
          {activeTab === 'withdraws' && (
            <EventList events={data?.withdraws || []} formatAmount={formatAmount} />
          )}
          {activeTab === 'liquidations' && (
            <EventList events={data?.liquidations || []} formatAmount={formatAmount} />
          )}
          {activeTab === 'transfers' && (
            <EventList events={data?.transfers || []} formatAmount={formatAmount} />
          )}
        </div>
      </div>
    </div>
  );
}

function EventList({ events, formatAmount }) {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-12 text-dark-500">
        <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p>No events found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event, i) => (
        <div key={`${event.txHash}-${i}`} className="flex items-center gap-4 py-3 px-3 rounded-lg hover:bg-dark-800/30 transition-colors">
          <span className={`event-badge ${getEventBadgeClass(event.eventName)}`}>
            {event.eventName}
          </span>
          <span className="text-white font-mono text-sm">
            {formatAmount(event.decoded?.amount)}
          </span>
          <Link to={`/tx/${event.txHash}`} className="address-link font-mono flex-1 truncate">
            {truncateTxHash(event.txHash)}
          </Link>
          <span className="text-dark-400 text-sm flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTimeAgo(event.timestamp)}
          </span>
          <a
            href={`https://sepolia.etherscan.io/tx/${event.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded hover:bg-dark-700 text-dark-400 hover:text-comet-400 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      ))}
    </div>
  );
}

export default AddressDetail;
