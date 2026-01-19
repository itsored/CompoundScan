import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Zap,
  ArrowUpRight,
  Clock,
  Box,
  Layers,
  RefreshCw,
  CheckCircle,
  Wifi,
  ExternalLink,
  Coins,
  Percent,
  FileText,
  BarChart3
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { formatNumber, formatTimeAgo, truncateAddress, truncateTxHash, getEventBadgeClass, formatWei } from '../utils/format';

function LiveStatCard({ title, value, subValue, icon: Icon, color = 'comet', loading }) {
  const colorClasses = {
    comet: 'bg-comet-500/20 text-comet-400',
    green: 'bg-green-500/20 text-green-400',
    orange: 'bg-orange-500/20 text-orange-400',
    blue: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-dark-400 text-sm font-medium">{title}</p>
          {loading ? (
            <div className="h-9 w-24 bg-dark-700 rounded animate-pulse mt-2" />
          ) : (
            <>
              <p className="text-3xl font-bold mt-2 text-white">{value}</p>
              {subValue && <p className="text-dark-500 text-sm mt-1">{subValue}</p>}
            </>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function EventRow({ event }) {
  // Handle both Etherscan format (eventName) and live RPC format (event)
  const eventName = event.eventName || event.event || 'Unknown';
  const amount = event.decoded?.amount || event.args?.amount;
  const formattedAmount = amount ? formatWei(amount, 18) : null;

  return (
    <div className="flex items-center gap-4 py-3 border-b border-dark-800/50 last:border-0 hover:bg-dark-800/30 px-2 rounded-lg transition-colors">
      <span className={`event-badge ${getEventBadgeClass(eventName)}`}>
        {eventName}
      </span>
      <div className="flex-1 min-w-0">
        <a 
          href={`https://sepolia.etherscan.io/tx/${event.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="address-link text-sm truncate block flex items-center gap-1"
        >
          {truncateTxHash(event.txHash)}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      {formattedAmount && (
        <span className="text-dark-300 text-sm font-mono">
          {parseFloat(formattedAmount).toFixed(4)}
        </span>
      )}
      {event.timestamp && (
        <div className="text-dark-400 text-sm flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTimeAgo(event.timestamp)}
        </div>
      )}
      <div className="text-dark-500 text-sm font-mono">
        #{formatNumber(event.blockNumber)}
      </div>
    </div>
  );
}

function AddressRow({ addr, index }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-6 h-6 rounded-full bg-comet-500/20 text-comet-400 text-xs font-bold flex items-center justify-center">
        {index + 1}
      </span>
      <a
        href={`https://sepolia.etherscan.io/address/${addr.address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="address-link text-sm flex-1 truncate flex items-center gap-1"
      >
        {truncateAddress(addr.address)}
        <ExternalLink className="w-3 h-3" />
      </a>
      <span className="text-dark-400 text-sm">
        {addr.txCount} txs
      </span>
    </div>
  );
}

function Dashboard() {
  // Live blockchain data (via RPC - always works)
  const { data: liveData, loading: liveLoading, refetch: refetchLive } = useApi('/live/status');
  const { data: liveEvents, refetch: refetchLiveEvents } = useApi('/live/events');
  
  // Etherscan API status
  const { data: etherscanStatus } = useApi('/etherscan/status');
  
  // Etherscan data (requires API key)
  const etherscanConfigured = etherscanStatus?.configured;
  const { data: etherscanStats, loading: statsLoading, refetch: refetchStats } = useApi(
    etherscanConfigured ? '/etherscan/stats' : null
  );
  const { data: etherscanEvents, loading: eventsLoading, refetch: refetchEvents } = useApi(
    etherscanConfigured ? '/etherscan/events?limit=10' : null
  );
  const { data: etherscanAddresses, loading: addressesLoading, refetch: refetchAddresses } = useApi(
    etherscanConfigured ? '/etherscan/addresses?limit=5' : null
  );
  
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  const handleRefresh = () => {
    refetchLive();
    refetchLiveEvents();
    if (etherscanConfigured) {
      refetchStats();
      refetchEvents();
      refetchAddresses();
    }
    setLastRefresh(new Date());
  };

  // Use Etherscan data if available, otherwise fall back to live RPC data
  const events = etherscanConfigured ? (etherscanEvents || []) : (liveEvents?.events || []);
  const addresses = etherscanAddresses || [];
  const stats = etherscanStats || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-white">
              Compound V3 <span className="gradient-text">Explorer</span>
            </h1>
            <p className="text-dark-400 mt-2">
              Live data from Comet WETH Market on Ethereum Sepolia
            </p>
          </div>
          <div className="flex items-center gap-3">
            {liveData && (
              <div className="flex items-center gap-2 px-4 py-2 glass rounded-xl border border-green-500/30">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <Wifi className="w-4 h-4 text-green-400" />
                <span className="text-sm text-white font-mono">Block #{formatNumber(liveData.currentBlock)}</span>
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={liveLoading || statsLoading}
              className="p-3 glass rounded-xl hover:bg-dark-700 transition-colors border border-dark-600 hover:border-comet-500/50"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 text-comet-400 ${(liveLoading || statsLoading) ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className={`glass rounded-2xl p-4 border animate-slide-up ${etherscanConfigured ? 'border-green-500/30' : 'border-orange-500/30'}`}>
        <div className="flex items-center gap-3 flex-wrap">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="text-green-400 font-medium">RPC Connected</span>
          <span className="text-dark-500 text-sm">•</span>
          {etherscanConfigured ? (
            <span className="text-green-400 text-sm">Etherscan API ✓</span>
          ) : (
            <span className="text-orange-400 text-sm">Etherscan API: No key configured</span>
          )}
          <span className="text-dark-500 text-sm ml-auto">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
        </div>
        {!etherscanConfigured && (
          <div className="mt-3 pt-3 border-t border-dark-700 text-sm text-dark-400">
            <span className="text-orange-400">💡 Tip:</span> Get a free Etherscan API key at{' '}
            <a href="https://etherscan.io/apis" target="_blank" rel="noopener noreferrer" className="text-comet-400 hover:underline">
              etherscan.io/apis
            </a>{' '}
            and set <code className="text-comet-300 bg-dark-800 px-1 rounded">ETHERSCAN_API_KEY</code> env variable for historical data.
          </div>
        )}
      </div>

      {/* Live Protocol Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <LiveStatCard
          title="Total Supply"
          value={liveData ? `${parseFloat(liveData.protocol.totalSupply).toFixed(4)}` : '—'}
          subValue="WETH"
          icon={TrendingUp}
          color="green"
          loading={liveLoading}
        />
        <LiveStatCard
          title="Total Borrow"
          value={liveData ? `${parseFloat(liveData.protocol.totalBorrow).toFixed(4)}` : '—'}
          subValue="WETH"
          icon={TrendingDown}
          color="orange"
          loading={liveLoading}
        />
        <LiveStatCard
          title="Utilization"
          value={liveData ? liveData.protocol.utilization : '—'}
          subValue="Borrow / Supply"
          icon={Percent}
          color="comet"
          loading={liveLoading}
        />
        <LiveStatCard
          title="Collateral Assets"
          value={liveData ? liveData.contract.numCollateralAssets : '—'}
          subValue="Supported"
          icon={Layers}
          color="blue"
          loading={liveLoading}
        />
      </div>

      {/* Etherscan Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Activity className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-dark-300 font-medium">Total Events</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {statsLoading ? '...' : formatNumber(stats.totalEvents || 0)}
          </p>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-dark-300 font-medium">Transactions</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {statsLoading ? '...' : formatNumber(stats.totalTransactions || 0)}
          </p>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-comet-500/20">
              <Users className="w-5 h-5 text-comet-400" />
            </div>
            <span className="text-dark-300 font-medium">Unique Addresses</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {statsLoading ? '...' : formatNumber(stats.uniqueAddresses || 0)}
          </p>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <BarChart3 className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-dark-300 font-medium">Event Types</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {statsLoading ? '...' : Object.keys(stats.eventCounts || {}).length}
          </p>
        </div>
      </div>

      {/* Event Type Breakdown */}
      {stats.eventCounts && Object.keys(stats.eventCounts).length > 0 && (
        <div className="glass rounded-2xl p-6 animate-slide-up">
          <h2 className="text-lg font-display font-semibold text-white mb-4">Event Breakdown</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.eventCounts).map(([name, count]) => (
              <div key={name} className={`px-4 py-2 rounded-xl ${getEventBadgeClass(name)} flex items-center gap-2`}>
                <span>{name}</span>
                <span className="opacity-70">({count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contract Info */}
      {liveData && (
        <div className="glass rounded-2xl p-6 animate-slide-up">
          <h2 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5 text-comet-400" />
            Contract Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-dark-400 text-sm mb-1">Market Contract</p>
              <a 
                href={`https://sepolia.etherscan.io/address/${liveData.contract.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="address-link font-mono text-sm flex items-center gap-1"
              >
                {truncateAddress(liveData.contract.address, 10, 8)}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div>
              <p className="text-dark-400 text-sm mb-1">Base Token</p>
              <a 
                href={`https://sepolia.etherscan.io/address/${liveData.contract.baseToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="address-link font-mono text-sm flex items-center gap-1"
              >
                {liveData.contract.baseSymbol} ({truncateAddress(liveData.contract.baseToken)})
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div>
              <p className="text-dark-400 text-sm mb-1">Network</p>
              <p className="text-white font-medium flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-400 rounded-full" />
                {liveData.network} (Chain ID: {liveData.chainId})
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Events & Top Addresses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Events */}
        <div className="lg:col-span-2 glass rounded-2xl p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-semibold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-comet-400" />
              Recent Events
            </h2>
            <Link to="/events" className="text-sm text-comet-400 hover:text-comet-300 flex items-center gap-1">
              View all <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {eventsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-dark-800/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : events.length > 0 ? (
            <div className="space-y-1">
              {events.map((event, i) => (
                <EventRow key={`${event.txHash}-${event.logIndex}-${i}`} event={event} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-dark-500">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No events found</p>
            </div>
          )}
        </div>

        {/* Top Addresses */}
        <div className="glass rounded-2xl p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-comet-400" />
              Top Addresses
            </h2>
            <Link to="/addresses" className="text-sm text-comet-400 hover:text-comet-300 flex items-center gap-1">
              View all <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {addressesLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-dark-800/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : addresses.length > 0 ? (
            <div className="space-y-2">
              {addresses.map((addr, index) => (
                <AddressRow key={addr.address} addr={addr} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-dark-500">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No addresses found</p>
            </div>
          )}
        </div>
      </div>

      {/* Protocol Info */}
      <div className="glass rounded-2xl p-6 animate-slide-up">
        <h2 className="text-xl font-display font-semibold text-white mb-4">About Compound V3 (Comet)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-dark-300">
          <div>
            <h3 className="text-comet-400 font-semibold mb-2">What is Comet?</h3>
            <p>Compound III (Comet) is a streamlined DeFi lending protocol with a single borrowable asset per market, enhanced capital efficiency, and improved risk management.</p>
          </div>
          <div>
            <h3 className="text-comet-400 font-semibold mb-2">Data Source</h3>
            <p>This explorer fetches data directly from Etherscan API - no database required! Free tier allows 100,000 API calls per day.</p>
          </div>
          <div>
            <h3 className="text-comet-400 font-semibold mb-2">What We Track</h3>
            <p>Supply, Withdraw, SupplyCollateral, WithdrawCollateral, Liquidation (Absorb), and Transfer events.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
