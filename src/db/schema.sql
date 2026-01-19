-- CompoundScan Database Schema
-- PostgreSQL database for indexing Compound V3 (Comet) protocol activities

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES
-- ============================================

-- Networks/Chains tracked
CREATE TABLE IF NOT EXISTS networks (
    id SERIAL PRIMARY KEY,
    chain_id INTEGER UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    rpc_url TEXT,
    block_explorer VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contracts being tracked
CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    address VARCHAR(42) NOT NULL,
    network_id INTEGER REFERENCES networks(id),
    name VARCHAR(100) NOT NULL,
    contract_type VARCHAR(50) NOT NULL, -- 'market', 'configurator', 'rewards', 'bulker', 'governance'
    deploy_block BIGINT,
    abi_hash VARCHAR(66),
    is_proxy BOOLEAN DEFAULT false,
    implementation_address VARCHAR(42),
    base_token_address VARCHAR(42),
    base_token_symbol VARCHAR(20),
    base_token_decimals INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(address, network_id)
);

-- Indexing progress tracker
CREATE TABLE IF NOT EXISTS indexer_state (
    id SERIAL PRIMARY KEY,
    network_id INTEGER REFERENCES networks(id),
    contract_id INTEGER REFERENCES contracts(id),
    last_indexed_block BIGINT NOT NULL DEFAULT 0,
    last_indexed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'idle', -- 'idle', 'running', 'error'
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(network_id, contract_id)
);

-- ============================================
-- BLOCKCHAIN DATA TABLES
-- ============================================

-- Blocks
CREATE TABLE IF NOT EXISTS blocks (
    id SERIAL PRIMARY KEY,
    network_id INTEGER REFERENCES networks(id),
    block_number BIGINT NOT NULL,
    block_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    gas_used BIGINT,
    gas_limit BIGINT,
    base_fee_per_gas BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(network_id, block_number)
);

CREATE INDEX idx_blocks_number ON blocks(network_id, block_number);
CREATE INDEX idx_blocks_timestamp ON blocks(timestamp);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    network_id INTEGER REFERENCES networks(id),
    block_id INTEGER REFERENCES blocks(id),
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    tx_index INTEGER,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42),
    contract_id INTEGER REFERENCES contracts(id),
    value NUMERIC(78, 0) DEFAULT 0,
    gas_used BIGINT,
    gas_price BIGINT,
    max_fee_per_gas BIGINT,
    max_priority_fee BIGINT,
    input_data TEXT,
    function_name VARCHAR(100),
    function_signature VARCHAR(10),
    decoded_input JSONB,
    status SMALLINT, -- 0 = failed, 1 = success
    error_message TEXT,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(network_id, tx_hash)
);

CREATE INDEX idx_transactions_block ON transactions(network_id, block_number);
CREATE INDEX idx_transactions_from ON transactions(from_address);
CREATE INDEX idx_transactions_to ON transactions(to_address);
CREATE INDEX idx_transactions_contract ON transactions(contract_id);
CREATE INDEX idx_transactions_function ON transactions(function_name);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp);

-- Events/Logs
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    network_id INTEGER REFERENCES networks(id),
    transaction_id INTEGER REFERENCES transactions(id),
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    log_index INTEGER NOT NULL,
    contract_id INTEGER REFERENCES contracts(id),
    contract_address VARCHAR(42) NOT NULL,
    event_name VARCHAR(100) NOT NULL,
    event_signature VARCHAR(66),
    topic0 VARCHAR(66),
    topic1 VARCHAR(66),
    topic2 VARCHAR(66),
    topic3 VARCHAR(66),
    raw_data TEXT,
    decoded_data JSONB,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(network_id, tx_hash, log_index)
);

CREATE INDEX idx_events_block ON events(network_id, block_number);
CREATE INDEX idx_events_contract ON events(contract_id);
CREATE INDEX idx_events_name ON events(event_name);
CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_events_address ON events(contract_address);

-- ============================================
-- PROTOCOL-SPECIFIC TABLES
-- ============================================

-- Addresses/Accounts interacting with protocol
CREATE TABLE IF NOT EXISTS addresses (
    id SERIAL PRIMARY KEY,
    address VARCHAR(42) NOT NULL UNIQUE,
    label VARCHAR(255),
    address_type VARCHAR(50), -- 'user', 'contract', 'governance', 'liquidator'
    first_seen_block BIGINT,
    first_seen_at TIMESTAMP,
    last_seen_block BIGINT,
    last_seen_at TIMESTAMP,
    transaction_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_addresses_type ON addresses(address_type);

-- Supply Events (base token supplied)
CREATE TABLE IF NOT EXISTS supply_events (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id),
    network_id INTEGER REFERENCES networks(id),
    contract_id INTEGER REFERENCES contracts(id),
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    amount_usd NUMERIC(20, 6),
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_supply_from ON supply_events(from_address);
CREATE INDEX idx_supply_to ON supply_events(to_address);
CREATE INDEX idx_supply_timestamp ON supply_events(timestamp);
CREATE INDEX idx_supply_contract ON supply_events(contract_id);

-- Supply Collateral Events
CREATE TABLE IF NOT EXISTS supply_collateral_events (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id),
    network_id INTEGER REFERENCES networks(id),
    contract_id INTEGER REFERENCES contracts(id),
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    asset_address VARCHAR(42) NOT NULL,
    asset_symbol VARCHAR(20),
    amount NUMERIC(78, 0) NOT NULL,
    amount_usd NUMERIC(20, 6),
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_supply_collateral_from ON supply_collateral_events(from_address);
CREATE INDEX idx_supply_collateral_asset ON supply_collateral_events(asset_address);
CREATE INDEX idx_supply_collateral_timestamp ON supply_collateral_events(timestamp);

-- Withdraw Events (base token withdrawn / borrowed)
CREATE TABLE IF NOT EXISTS withdraw_events (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id),
    network_id INTEGER REFERENCES networks(id),
    contract_id INTEGER REFERENCES contracts(id),
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    src_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    amount_usd NUMERIC(20, 6),
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_withdraw_src ON withdraw_events(src_address);
CREATE INDEX idx_withdraw_to ON withdraw_events(to_address);
CREATE INDEX idx_withdraw_timestamp ON withdraw_events(timestamp);

-- Withdraw Collateral Events
CREATE TABLE IF NOT EXISTS withdraw_collateral_events (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id),
    network_id INTEGER REFERENCES networks(id),
    contract_id INTEGER REFERENCES contracts(id),
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    src_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    asset_address VARCHAR(42) NOT NULL,
    asset_symbol VARCHAR(20),
    amount NUMERIC(78, 0) NOT NULL,
    amount_usd NUMERIC(20, 6),
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_withdraw_collateral_src ON withdraw_collateral_events(src_address);
CREATE INDEX idx_withdraw_collateral_asset ON withdraw_collateral_events(asset_address);
CREATE INDEX idx_withdraw_collateral_timestamp ON withdraw_collateral_events(timestamp);

-- Liquidation Events (AbsorbCollateral + AbsorbDebt)
CREATE TABLE IF NOT EXISTS liquidation_events (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id),
    network_id INTEGER REFERENCES networks(id),
    contract_id INTEGER REFERENCES contracts(id),
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    absorber_address VARCHAR(42) NOT NULL,
    borrower_address VARCHAR(42) NOT NULL,
    collateral_asset VARCHAR(42),
    collateral_absorbed NUMERIC(78, 0),
    collateral_usd_value NUMERIC(20, 6),
    base_paid_out NUMERIC(78, 0),
    base_usd_value NUMERIC(20, 6),
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_liquidation_absorber ON liquidation_events(absorber_address);
CREATE INDEX idx_liquidation_borrower ON liquidation_events(borrower_address);
CREATE INDEX idx_liquidation_timestamp ON liquidation_events(timestamp);

-- Buy Collateral Events (collateral auctions)
CREATE TABLE IF NOT EXISTS buy_collateral_events (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id),
    network_id INTEGER REFERENCES networks(id),
    contract_id INTEGER REFERENCES contracts(id),
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    buyer_address VARCHAR(42) NOT NULL,
    asset_address VARCHAR(42) NOT NULL,
    asset_symbol VARCHAR(20),
    base_amount NUMERIC(78, 0) NOT NULL,
    collateral_amount NUMERIC(78, 0) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_buy_collateral_buyer ON buy_collateral_events(buyer_address);
CREATE INDEX idx_buy_collateral_timestamp ON buy_collateral_events(timestamp);

-- Reward Claims
CREATE TABLE IF NOT EXISTS reward_claims (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id),
    network_id INTEGER REFERENCES networks(id),
    contract_id INTEGER REFERENCES contracts(id),
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    src_address VARCHAR(42) NOT NULL,
    recipient_address VARCHAR(42) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    token_symbol VARCHAR(20),
    amount NUMERIC(78, 0) NOT NULL,
    amount_usd NUMERIC(20, 6),
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reward_claims_src ON reward_claims(src_address);
CREATE INDEX idx_reward_claims_recipient ON reward_claims(recipient_address);
CREATE INDEX idx_reward_claims_timestamp ON reward_claims(timestamp);

-- Transfer Events (base token transfers)
CREATE TABLE IF NOT EXISTS transfer_events (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id),
    network_id INTEGER REFERENCES networks(id),
    contract_id INTEGER REFERENCES contracts(id),
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transfer_from ON transfer_events(from_address);
CREATE INDEX idx_transfer_to ON transfer_events(to_address);
CREATE INDEX idx_transfer_timestamp ON transfer_events(timestamp);

-- ============================================
-- ANALYTICS & SNAPSHOTS
-- ============================================

-- Protocol metrics snapshots (hourly/daily)
CREATE TABLE IF NOT EXISTS protocol_snapshots (
    id SERIAL PRIMARY KEY,
    network_id INTEGER REFERENCES networks(id),
    contract_id INTEGER REFERENCES contracts(id),
    snapshot_type VARCHAR(20) NOT NULL, -- 'hourly', 'daily'
    block_number BIGINT NOT NULL,
    total_supply NUMERIC(78, 0),
    total_borrow NUMERIC(78, 0),
    total_supply_usd NUMERIC(20, 6),
    total_borrow_usd NUMERIC(20, 6),
    utilization_rate NUMERIC(10, 6),
    supply_rate NUMERIC(20, 18),
    borrow_rate NUMERIC(20, 18),
    unique_suppliers INTEGER,
    unique_borrowers INTEGER,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_protocol_snapshots_time ON protocol_snapshots(timestamp);
CREATE INDEX idx_protocol_snapshots_type ON protocol_snapshots(snapshot_type);

-- Account balances snapshots
CREATE TABLE IF NOT EXISTS account_snapshots (
    id SERIAL PRIMARY KEY,
    address_id INTEGER REFERENCES addresses(id),
    network_id INTEGER REFERENCES networks(id),
    contract_id INTEGER REFERENCES contracts(id),
    block_number BIGINT NOT NULL,
    base_balance NUMERIC(78, 0),
    borrow_balance NUMERIC(78, 0),
    collateral_balances JSONB, -- {asset_address: balance}
    total_collateral_usd NUMERIC(20, 6),
    is_liquidatable BOOLEAN,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_account_snapshots_address ON account_snapshots(address_id);
CREATE INDEX idx_account_snapshots_time ON account_snapshots(timestamp);

-- ============================================
-- GOVERNANCE TABLES
-- ============================================

-- Governance proposals (if tracking governance)
CREATE TABLE IF NOT EXISTS governance_proposals (
    id SERIAL PRIMARY KEY,
    network_id INTEGER REFERENCES networks(id),
    proposal_id BIGINT NOT NULL,
    proposer_address VARCHAR(42) NOT NULL,
    title TEXT,
    description TEXT,
    targets JSONB,
    values JSONB,
    signatures JSONB,
    calldatas JSONB,
    start_block BIGINT,
    end_block BIGINT,
    status VARCHAR(20),
    for_votes NUMERIC(78, 0),
    against_votes NUMERIC(78, 0),
    abstain_votes NUMERIC(78, 0),
    executed_at TIMESTAMP,
    tx_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(network_id, proposal_id)
);

-- Configuration changes
CREATE TABLE IF NOT EXISTS config_changes (
    id SERIAL PRIMARY KEY,
    network_id INTEGER REFERENCES networks(id),
    contract_id INTEGER REFERENCES contracts(id),
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    parameter_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT NOT NULL,
    changed_by VARCHAR(42),
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_config_changes_param ON config_changes(parameter_name);
CREATE INDEX idx_config_changes_timestamp ON config_changes(timestamp);

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert Sepolia network
INSERT INTO networks (chain_id, name, rpc_url, block_explorer)
VALUES (11155111, 'Ethereum Sepolia', 'https://rpc.sepolia.org', 'https://sepolia.etherscan.io')
ON CONFLICT (chain_id) DO NOTHING;

-- Insert Ethereum Mainnet (for future use)
INSERT INTO networks (chain_id, name, rpc_url, block_explorer)
VALUES (1, 'Ethereum Mainnet', 'https://eth.llamarpc.com', 'https://etherscan.io')
ON CONFLICT (chain_id) DO NOTHING;

