import db from '../db/index.js';
import { logger } from '../utils/logger.js';

/**
 * Event handlers for Compound V3 (Comet) events
 */

/**
 * Handle Supply event (base token supplied)
 */
export async function handleSupplyEvent(event, networkId, contractId, timestamp) {
  const { from, dst, amount } = event.decoded;

  await db.query(
    `INSERT INTO supply_events 
     (event_id, network_id, contract_id, tx_hash, block_number, from_address, to_address, amount, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT DO NOTHING`,
    [
      event.id,
      networkId,
      contractId,
      event.txHash,
      event.blockNumber,
      from?.toLowerCase(),
      dst?.toLowerCase(),
      amount?.toString() || '0',
      timestamp,
    ]
  );

  logger.debug('Indexed Supply event', { txHash: event.txHash });
}

/**
 * Handle SupplyCollateral event
 */
export async function handleSupplyCollateralEvent(event, networkId, contractId, timestamp) {
  const { from, dst, asset, amount } = event.decoded;

  await db.query(
    `INSERT INTO supply_collateral_events 
     (event_id, network_id, contract_id, tx_hash, block_number, from_address, to_address, asset_address, amount, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT DO NOTHING`,
    [
      event.id,
      networkId,
      contractId,
      event.txHash,
      event.blockNumber,
      from?.toLowerCase(),
      dst?.toLowerCase(),
      asset?.toLowerCase(),
      amount?.toString() || '0',
      timestamp,
    ]
  );

  logger.debug('Indexed SupplyCollateral event', { txHash: event.txHash });
}

/**
 * Handle Withdraw event (base token withdrawn)
 */
export async function handleWithdrawEvent(event, networkId, contractId, timestamp) {
  const { src, to, amount } = event.decoded;

  await db.query(
    `INSERT INTO withdraw_events 
     (event_id, network_id, contract_id, tx_hash, block_number, src_address, to_address, amount, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT DO NOTHING`,
    [
      event.id,
      networkId,
      contractId,
      event.txHash,
      event.blockNumber,
      src?.toLowerCase(),
      to?.toLowerCase(),
      amount?.toString() || '0',
      timestamp,
    ]
  );

  logger.debug('Indexed Withdraw event', { txHash: event.txHash });
}

/**
 * Handle WithdrawCollateral event
 */
export async function handleWithdrawCollateralEvent(event, networkId, contractId, timestamp) {
  const { src, to, asset, amount } = event.decoded;

  await db.query(
    `INSERT INTO withdraw_collateral_events 
     (event_id, network_id, contract_id, tx_hash, block_number, src_address, to_address, asset_address, amount, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT DO NOTHING`,
    [
      event.id,
      networkId,
      contractId,
      event.txHash,
      event.blockNumber,
      src?.toLowerCase(),
      to?.toLowerCase(),
      asset?.toLowerCase(),
      amount?.toString() || '0',
      timestamp,
    ]
  );

  logger.debug('Indexed WithdrawCollateral event', { txHash: event.txHash });
}

/**
 * Handle AbsorbCollateral event (liquidation)
 */
export async function handleAbsorbCollateralEvent(event, networkId, contractId, timestamp) {
  const { absorber, borrower, asset, collateralAbsorbed, usdValue } = event.decoded;

  await db.query(
    `INSERT INTO liquidation_events 
     (event_id, network_id, contract_id, tx_hash, block_number, absorber_address, borrower_address, 
      collateral_asset, collateral_absorbed, collateral_usd_value, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT DO NOTHING`,
    [
      event.id,
      networkId,
      contractId,
      event.txHash,
      event.blockNumber,
      absorber?.toLowerCase(),
      borrower?.toLowerCase(),
      asset?.toLowerCase(),
      collateralAbsorbed?.toString() || '0',
      usdValue?.toString() || '0',
      timestamp,
    ]
  );

  logger.debug('Indexed AbsorbCollateral event', { txHash: event.txHash });
}

/**
 * Handle AbsorbDebt event (liquidation)
 */
export async function handleAbsorbDebtEvent(event, networkId, contractId, timestamp) {
  const { absorber, borrower, basePaidOut, usdValue } = event.decoded;

  // Update existing liquidation event with debt info
  await db.query(
    `UPDATE liquidation_events 
     SET base_paid_out = $1, base_usd_value = $2
     WHERE tx_hash = $3 AND borrower_address = $4`,
    [basePaidOut?.toString() || '0', usdValue?.toString() || '0', event.txHash, borrower?.toLowerCase()]
  );

  logger.debug('Indexed AbsorbDebt event', { txHash: event.txHash });
}

/**
 * Handle BuyCollateral event
 */
export async function handleBuyCollateralEvent(event, networkId, contractId, timestamp) {
  const { buyer, asset, baseAmount, collateralAmount } = event.decoded;

  await db.query(
    `INSERT INTO buy_collateral_events 
     (event_id, network_id, contract_id, tx_hash, block_number, buyer_address, asset_address, base_amount, collateral_amount, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT DO NOTHING`,
    [
      event.id,
      networkId,
      contractId,
      event.txHash,
      event.blockNumber,
      buyer?.toLowerCase(),
      asset?.toLowerCase(),
      baseAmount?.toString() || '0',
      collateralAmount?.toString() || '0',
      timestamp,
    ]
  );

  logger.debug('Indexed BuyCollateral event', { txHash: event.txHash });
}

/**
 * Handle Transfer event
 */
export async function handleTransferEvent(event, networkId, contractId, timestamp) {
  const { from, to, amount } = event.decoded;

  await db.query(
    `INSERT INTO transfer_events 
     (event_id, network_id, contract_id, tx_hash, block_number, from_address, to_address, amount, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT DO NOTHING`,
    [
      event.id,
      networkId,
      contractId,
      event.txHash,
      event.blockNumber,
      from?.toLowerCase(),
      to?.toLowerCase(),
      amount?.toString() || '0',
      timestamp,
    ]
  );

  logger.debug('Indexed Transfer event', { txHash: event.txHash });
}

/**
 * Handle RewardClaimed event
 */
export async function handleRewardClaimedEvent(event, networkId, contractId, timestamp) {
  const { src, recipient, token, amount } = event.decoded;

  await db.query(
    `INSERT INTO reward_claims 
     (event_id, network_id, contract_id, tx_hash, block_number, src_address, recipient_address, token_address, amount, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT DO NOTHING`,
    [
      event.id,
      networkId,
      contractId,
      event.txHash,
      event.blockNumber,
      src?.toLowerCase(),
      recipient?.toLowerCase(),
      token?.toLowerCase(),
      amount?.toString() || '0',
      timestamp,
    ]
  );

  logger.debug('Indexed RewardClaimed event', { txHash: event.txHash });
}

/**
 * Map event name to handler
 */
export const eventHandlers = {
  Supply: handleSupplyEvent,
  SupplyCollateral: handleSupplyCollateralEvent,
  Withdraw: handleWithdrawEvent,
  WithdrawCollateral: handleWithdrawCollateralEvent,
  AbsorbCollateral: handleAbsorbCollateralEvent,
  AbsorbDebt: handleAbsorbDebtEvent,
  BuyCollateral: handleBuyCollateralEvent,
  Transfer: handleTransferEvent,
  TransferCollateral: handleWithdrawCollateralEvent, // Similar structure
  RewardClaimed: handleRewardClaimedEvent,
};

export default eventHandlers;

