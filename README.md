# CompoundScan 🔍

A comprehensive blockchain explorer for visualizing all activities of the **Compound V3 (Comet)** DeFi protocol on Ethereum Sepolia testnet.

![CompoundScan](https://img.shields.io/badge/Compound-V3%20Explorer-00d395?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs)
![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react)
![Etherscan](https://img.shields.io/badge/Etherscan-API-21325B?style=for-the-badge)

## 🎯 Project Overview

CompoundScan tracks and displays all protocol activities including:

- **Supply Events** - Base token and collateral deposits
- **Withdraw Events** - Borrows and collateral withdrawals  
- **Liquidations** - AbsorbCollateral and AbsorbDebt events
- **Transfers** - Token movements within the protocol
- **All Transactions** - Function calls to the Comet contract

### Key Features

- 📊 **Live Protocol Stats** - Real-time supply, borrow, and utilization data
- 🔎 **Address Tracking** - Complete activity history for any address
- 📅 **Query Explorer** - Search addresses by date range with full activity details
- 🔗 **Event Browser** - Filter and explore all protocol events
- 📈 **Transaction History** - View all contract interactions
- 🌐 **Etherscan Integration** - No database required, fetches data directly from Etherscan API

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CompoundScan                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Ethereum   │    │  Etherscan   │    │   Express    │      │
│  │     RPC      │    │     API      │    │   Backend    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         │                   │                   │               │
│         └───────────────────┴───────────────────┘               │
│                             │                                    │
│                             ▼                                    │
│                     ┌──────────────┐                            │
│                     │    React     │                            │
│                     │   Frontend   │                            │
│                     └──────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 📂 Project Structure

```
compoundscan/
├── src/                          # Backend source code
│   ├── api/                      # REST API routes
│   │   ├── routes/
│   │   │   ├── etherscan.js      # Etherscan API endpoints
│   │   │   └── live.js           # Live RPC data endpoints
│   │   └── index.js              # API router
│   ├── config/                   # Configuration
│   │   ├── abi/                  # Contract ABIs
│   │   ├── contracts.js          # Contract addresses
│   │   └── index.js              # Config loader
│   ├── services/                 # External services
│   │   └── etherscan.js          # Etherscan API service
│   ├── utils/                    # Utilities
│   │   ├── logger.js             # Winston logger
│   │   └── formatters.js         # Data formatters
│   └── index.js                  # Main server entry
├── client/                       # React frontend
│   ├── src/
│   │   ├── components/           # React components
│   │   │   └── Layout.jsx        # Main layout with navigation
│   │   ├── pages/                # Page components
│   │   │   ├── Dashboard.jsx     # Main dashboard
│   │   │   ├── Events.jsx        # Events browser
│   │   │   ├── Transactions.jsx  # Transactions list
│   │   │   ├── Addresses.jsx     # Address explorer
│   │   │   ├── AddressDetail.jsx # Individual address view
│   │   │   ├── TransactionDetail.jsx # Transaction details
│   │   │   └── Query.jsx         # Date range query tool
│   │   ├── hooks/                # Custom React hooks
│   │   ├── utils/                # Frontend utilities
│   │   ├── App.jsx               # Main app with routes
│   │   └── main.jsx              # Entry point
│   ├── index.html
│   └── package.json
├── package.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18 or higher
- **Etherscan API Key** (free tier works)
- **Ethereum RPC** (optional, for live data - Alchemy free tier works)

### 1. Clone & Install

```bash
git clone https://github.com/itsored/CompoundScan.git
cd CompoundScan

# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install && cd ..
```

### 2. Configure API Keys

Edit `src/services/etherscan.js` and add your Etherscan API key:

```javascript
const ETHERSCAN_API_KEY = 'YOUR_ETHERSCAN_API_KEY';
```

(Optional) Edit `src/config/index.js` for RPC URL:

```javascript
SEPOLIA_RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY'
```

### 3. Start the Application

```bash
# Terminal 1: Start backend
node src/index.js

# Terminal 2: Start frontend
cd client && npm run dev
```

### 4. Open the App

Navigate to `http://localhost:3000` in your browser.

## 📡 API Endpoints

### Live Data (from RPC)

| Endpoint | Description |
|----------|-------------|
| `GET /api/live/status` | Live protocol stats (supply, borrow, utilization) |

### Etherscan Data

| Endpoint | Description |
|----------|-------------|
| `GET /api/etherscan/status` | API key configuration status |
| `GET /api/etherscan/events` | List protocol events |
| `GET /api/etherscan/events/types` | Event type counts |
| `GET /api/etherscan/transactions` | List transactions |
| `GET /api/etherscan/tx/:txHash` | Transaction details |
| `GET /api/etherscan/addresses` | List active addresses |
| `GET /api/etherscan/address/:address` | Address activity details |
| `GET /api/etherscan/stats` | Overall protocol statistics |
| `GET /api/etherscan/query` | Query addresses by date range |

### Query Parameters

- `limit` - Number of results (default: 20)
- `offset` - Pagination offset
- `eventType` - Filter by event type
- `startDate` / `endDate` - Date range filter (YYYY-MM-DD)

## 🔧 Compound V3 Contract

### Ethereum Sepolia (Testnet)

| Contract | Address |
|----------|---------|
| cWETHv3 (Proxy) | `0x2943ac1216979aD8dB76D9147F64E61adc126e96` |
| Base Token (WETH) | `0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9` |

### Tracked Events

- `Supply` - Base token supplied
- `SupplyCollateral` - Collateral deposited
- `Withdraw` - Base token withdrawn/borrowed
- `WithdrawCollateral` - Collateral withdrawn
- `AbsorbCollateral` - Liquidation (collateral seized)
- `AbsorbDebt` - Liquidation (debt absorbed)
- `Transfer` - Base token transfer
- `TransferCollateral` - Collateral transfer

## 🖥️ Pages

### Dashboard
- Live protocol statistics (Total Supply, Borrow, Utilization Rate)
- Recent events feed
- Top active addresses

### Events
- Browse all protocol events
- Filter by event type
- View event details and transaction links

### Transactions
- List of all contract transactions
- Function names and parameters
- Status and timestamp

### Addresses
- All addresses that interacted with the protocol
- Transaction and event counts
- Link to detailed view

### Query Explorer
- Select date range
- Find all addresses active in that period
- View aggregated activity per address
- Export results to CSV

## 🎨 UI Features

- Dark theme with modern glassmorphism design
- Responsive layout (mobile-friendly)
- Real-time data updates
- Event type color coding
- Address and transaction hash truncation with full copy
- Etherscan links for verification

## 🛠️ Development

### Tech Stack

**Backend:**
- Node.js + Express
- Ethers.js (blockchain interaction)
- Etherscan API (data fetching)
- Winston (logging)

**Frontend:**
- React 18 + Vite
- React Router
- Tailwind CSS
- Lucide Icons

### Rate Limiting

The Etherscan service includes:
- 350ms delay between API calls
- 60-second response caching
- Automatic retry on rate limit errors

## 🔗 Resources

- [Compound V3 Documentation](https://docs.compound.finance/)
- [Compound Finance GitHub](https://github.com/compound-finance)
- [Etherscan API Docs](https://docs.etherscan.io/)
- [Sepolia Testnet Faucet](https://sepoliafaucet.com/)

## 📝 License

MIT License

---

Built with ❤️ for the Compound community
