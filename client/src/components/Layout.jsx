import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Activity, 
  BarChart3, 
  FileText, 
  Users, 
  Search, 
  Menu, 
  X,
  Zap,
  Globe
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Events', href: '/events', icon: Activity },
  { name: 'Transactions', href: '/transactions', icon: FileText },
  { name: 'Addresses', href: '/addresses', icon: Users },
  { name: 'Query', href: '/query', icon: Search },
];

function Layout({ children }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.length < 3) return;

    // Check if it's an address
    if (searchQuery.match(/^0x[a-fA-F0-9]{40}$/)) {
      navigate(`/address/${searchQuery}`);
    }
    // Check if it's a transaction hash
    else if (searchQuery.match(/^0x[a-fA-F0-9]{64}$/)) {
      navigate(`/tx/${searchQuery}`);
    }
    
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-comet-500 to-comet-700 flex items-center justify-center animate-pulse-glow">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-display font-bold text-lg text-white group-hover:text-comet-400 transition-colors">
                  CompoundScan
                </h1>
                <p className="text-xs text-dark-400 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  Sepolia
                </p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-comet-500/20 text-comet-400 border border-comet-500/30'
                        : 'text-dark-300 hover:text-white hover:bg-dark-800/50'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Search */}
            <form onSubmit={handleSearch} className="hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search address or tx..."
                  className="w-64 pl-10 pr-4 py-2 bg-dark-800/50 border border-dark-700 rounded-lg text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-comet-500/50 focus:ring-1 focus:ring-comet-500/20 transition-all"
                />
              </div>
            </form>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-dark-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-dark-800 bg-dark-900/95 backdrop-blur-xl">
            <div className="px-4 py-4 space-y-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                      isActive
                        ? 'bg-comet-500/20 text-comet-400'
                        : 'text-dark-300 hover:bg-dark-800'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
              <form onSubmit={handleSearch} className="pt-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search address or tx..."
                    className="w-full pl-10 pr-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-comet-500/50"
                  />
                </div>
              </form>
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-dark-500 text-sm">
              <Zap className="w-4 h-4 text-comet-500" />
              <span>CompoundScan - Compound V3 Protocol Explorer</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-dark-500">
              <a href="https://compound.finance" target="_blank" rel="noopener" className="hover:text-comet-400 transition-colors">
                Compound Finance
              </a>
              <a href="https://docs.compound.finance" target="_blank" rel="noopener" className="hover:text-comet-400 transition-colors">
                Documentation
              </a>
              <a href="https://github.com/compound-finance" target="_blank" rel="noopener" className="hover:text-comet-400 transition-colors">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Layout;

