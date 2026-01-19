# CompoundScan 🔍

A comprehensive blockchain explorer for indexing and visualizing all activities of the **Compound V3 (Comet)** DeFi protocol, starting with Ethereum Sepolia testnet.

![CompoundScan](https://img.shields.io/badge/Compound-V3%20Explorer-00d395?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=for-the-badge&logo=postgresql)
![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react)

## 🎯 Project Overview

CompoundScan indexes and tracks all protocol activities including:

- **Supply Events** - Base token and collateral deposits
- **Withdraw Events** - Borrows and collateral withdrawals  
- **Liquidations** - AbsorbCollateral and AbsorbDebt events
- **Reward Claims** - COMP token distributions
- **Transfers** - Token movements within the protocol
- **Governance Actions** - Parameter changes and upgrades

### Key Features

- 📊 **Real-time Indexing** - Continuous monitoring of all Comet contracts
- 🔎 **Address Tracking** - Complete activity history for any address
- 📈 **Protocol Analytics** - Statistics and metrics dashboard
- 🔗 **Event Decoding** - Human-readable transaction and event data
- 🌐 **Multi-network Support** - Start with Sepolia, expand to Mainnet

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CompoundScan                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Indexer    │───▶│  PostgreSQL  │◀───│   REST API   │      │
│  │   Service    │    │   Database   │    │   Server     │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                                        │              │
│         │                                        │              │
│         ▼                                        ▼              │
│  ┌──────────────┐                        ┌──────────────┐      │
│  │   Ethereum   │                        │    React     │      │
│  │     RPC      │                        │   Frontend   │      │
│  └──────────────┘                        └──────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 📂 Project Structure

```
compoundscan/
├── src/                          # Backend source code
│   ├── api/                      # REST API routes
│   │   ├── routes/
│   │   │   ├── events.js         # Events endpoints
│   │   │   ├── transactions.js   # Transactions endpoints
│   │   │   ├── addresses.js      # Address endpoints
│   │   │   └── stats.js          # Statistics endpoints
│   │   └── index.js              # API router
│   ├── config/                   # Configuration
│   │   ├── abi/                  # Contract ABIs
│   │   ├── contracts.js          # Contract addresses
│   │   └── index.js              # Config loader
│   ├── db/                       # Database layer
│   │   ├── schema.sql            # Database schema
│   │   ├── index.js              # DB connection pool
│   │   └── migrate.js            # Migration script
│   ├── indexer/                  # Blockchain indexer
│   │   ├── index.js              # Main indexer
│   │   ├── provider.js           # Ethereum provider
│   │   └── eventHandlers.js      # Event processors
│   ├── utils/                    # Utilities
│   │   ├── logger.js             # Winston logger
│   │   └── formatters.js         # Data formatters
│   └── index.js                  # Main server entry
├── client/                       # React frontend
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── pages/                # Page components
│   │   ├── hooks/                # Custom hooks
│   │   ├── utils/                # Frontend utilities
│   │   ├── App.jsx               # Main app component
│   │   └── main.jsx              # Entry point
│   ├── index.html
│   └── package.json
├── package.json
├── env.example                   # Environment template
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18 or higher
- **PostgreSQL** v15 or higher
- **Ethereum RPC** (Alchemy, Infura, or public endpoint)

### 1. Clone & Install

```bash
git clone <repository-url>
cd compoundscan

# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install && cd ..
```

### 2. Configure Environment

```bash
# Copy environment template
cp env.example .env

# Edit .env with your configuration
```

Required environment variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/compoundscan
# Or individual settings:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=compoundscan
DB_USER=postgres
DB_PASSWORD=your_password

# Ethereum RPC (Sepolia)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Server
PORT=3001
```

### 3. Initialize Database

```bash
# Create database (if not exists)
createdb compoundscan

# Run migrations
npm run db:migrate
```

### 4. Start the Application

```bash
# Development mode (both backend and frontend)
npm run dev

# Or run separately:
npm run dev:server  # Backend on port 3001
npm run dev:client  # Frontend on port 3000
```

### 5. Start the Indexer

In a separate terminal:

```bash
# Start indexing Ethereum Mainnet (default)
npm run index

# Or specify network:
npm run index SEPOLIA
npm run index ETHEREUM_MAINNET
```

## 📡 API Endpoints

### Statistics

| Endpoint | Description |
|----------|-------------|
| `GET /api/stats/overview` | Protocol overview statistics |
| `GET /api/stats/activity` | Activity over time |
| `GET /api/stats/top-addresses` | Most active addresses |
| `GET /api/stats/liquidations` | Liquidation statistics |
| `GET /api/stats/contracts` | Tracked contracts info |

### Events

| Endpoint | Description |
|----------|-------------|
| `GET /api/events` | List all events (paginated) |
| `GET /api/events/types` | Event types with counts |
| `GET /api/events/tx/:txHash` | Events for a transaction |

Query parameters: `page`, `limit`, `event_name`, `from_block`, `to_block`, `from_date`, `to_date`

### Transactions

| Endpoint | Description |
|----------|-------------|
| `GET /api/transactions` | List transactions |
| `GET /api/transactions/:txHash` | Transaction details |

### Addresses

| Endpoint | Description |
|----------|-------------|
| `GET /api/addresses` | List all addresses |
| `GET /api/addresses/:address` | Address activity |
| `GET /api/addresses/:address/supplies` | Supply history |
| `GET /api/addresses/:address/borrows` | Borrow history |

### Search

| Endpoint | Description |
|----------|-------------|
| `GET /api/search?q=<query>` | Search addresses, transactions |

## 🔧 Compound V3 Contracts

### Ethereum Sepolia (Testnet)

| Contract | Address |
|----------|---------|
| cWETHv3 (Proxy) | `0x2943ac1216979aD8dB76D9147F64E61adc126e96` |

### Ethereum Mainnet

| Contract | Address |
|----------|---------|
| cUSDCv3 (Proxy) | `0xc3d688B66703497DAA19211EEdff47f25384cdc3` |
| cWETHv3 (Proxy) | `0xA17581A9E3356d9A858b789D68B4d866e593aE94` |
| cUSDTv3 (Proxy) | `0x3Afdc9BCA9213A35503b077a6072F3D0d5AB0840` |
| Rewards | `0x1B0e765F6224C21223AeA2af16c1C46E38885a40` |
| Configurator | `0x316f9708bB98af7dA9c68C1C3b5e79039cD336E3` |

### Tracked Events

- `Supply` - Base token supplied
- `SupplyCollateral` - Collateral deposited
- `Withdraw` - Base token withdrawn/borrowed
- `WithdrawCollateral` - Collateral withdrawn
- `AbsorbCollateral` - Liquidation (collateral seized)
- `AbsorbDebt` - Liquidation (debt absorbed)
- `BuyCollateral` - Collateral auction purchase
- `Transfer` - Base token transfer
- `TransferCollateral` - Collateral transfer
- `RewardClaimed` - Reward tokens claimed

## 📊 Database Schema

### Core Tables

- `networks` - Blockchain networks (Sepolia, Mainnet)
- `contracts` - Tracked contract addresses
- `indexer_state` - Indexing progress per contract

### Blockchain Data

- `blocks` - Block metadata
- `transactions` - Decoded transactions
- `events` - All protocol events

### Protocol-Specific

- `addresses` - Tracked addresses with stats
- `supply_events` - Base token supplies
- `supply_collateral_events` - Collateral deposits
- `withdraw_events` - Withdrawals/borrows
- `withdraw_collateral_events` - Collateral withdrawals
- `liquidation_events` - Liquidations
- `buy_collateral_events` - Collateral auctions
- `reward_claims` - Reward distributions
- `transfer_events` - Token transfers

### Analytics

- `protocol_snapshots` - Time-series protocol metrics
- `account_snapshots` - Account balance history

## 🛠️ Development

### Running Tests

```bash
npm test
```

### Adding New Networks

1. Add network config to `src/config/contracts.js`
2. Add contract addresses for the new network
3. Run migrations to add network to database
4. Start indexer with new network flag

### Adding New Event Types

1. Add event to ABI files in `src/config/abi/`
2. Create handler in `src/indexer/eventHandlers.js`
3. Add database table if needed
4. Register handler in event handlers map

## 🔗 Resources

- [Compound V3 Documentation](https://docs.compound.finance/)
- [Compound Finance GitHub](https://github.com/compound-finance)
- [Comet Protocol](https://compound.finance/governance/proposals)

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with ❤️ for the Compound community

