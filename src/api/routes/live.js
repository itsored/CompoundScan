import { Router } from 'express';
import { ethers } from 'ethers';
import { config } from '../../config/index.js';

const router = Router();

// Comet contract address on Sepolia
const COMET_ADDRESS = '0x2943ac1216979aD8dB76D9147F64E61adc126e96';

// ABI for reading contract state
const COMET_ABI = [
  'function totalSupply() view returns (uint256)',
  'function totalBorrow() view returns (uint256)',
  'function baseToken() view returns (address)',
  'function numAssets() view returns (uint8)',
  'function getUtilization() view returns (uint256)',
  'event Supply(address indexed from, address indexed dst, uint256 amount)',
  'event Withdraw(address indexed src, address indexed to, uint256 amount)',
  'event SupplyCollateral(address indexed from, address indexed dst, address indexed asset, uint256 amount)',
  'event WithdrawCollateral(address indexed src, address indexed to, address indexed asset, uint256 amount)',
  'event AbsorbCollateral(address indexed absorber, address indexed borrower, address indexed asset, uint256 collateralAbsorbed, uint256 usdValue)',
  'event Transfer(address indexed from, address indexed to, uint256 amount)',
];

let provider = null;
let contract = null;

function getProvider() {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(config.rpc.sepolia);
  }
  return provider;
}

function getContract() {
  if (!contract) {
    contract = new ethers.Contract(COMET_ADDRESS, COMET_ABI, getProvider());
  }
  return contract;
}

/**
 * GET /api/live/status
 * Get live blockchain connection status and contract info
 */
router.get('/status', async (req, res) => {
  try {
    const prov = getProvider();
    const comet = getContract();

    const [blockNumber, totalSupply, totalBorrow, baseToken, numAssets] = await Promise.all([
      prov.getBlockNumber(),
      comet.totalSupply(),
      comet.totalBorrow(),
      comet.baseToken(),
      comet.numAssets(),
    ]);

    // Calculate utilization
    const supply = parseFloat(ethers.formatEther(totalSupply));
    const borrow = parseFloat(ethers.formatEther(totalBorrow));
    const utilization = supply > 0 ? ((borrow / supply) * 100).toFixed(2) : '0';

    res.json({
      success: true,
      data: {
        network: 'Ethereum Sepolia',
        chainId: 11155111,
        currentBlock: Number(blockNumber),
        contract: {
          address: COMET_ADDRESS,
          baseToken: baseToken,
          baseSymbol: 'WETH',
          numCollateralAssets: Number(numAssets),
        },
        protocol: {
          totalSupply: ethers.formatEther(totalSupply),
          totalBorrow: ethers.formatEther(totalBorrow),
          totalSupplyRaw: totalSupply.toString(),
          totalBorrowRaw: totalBorrow.toString(),
          utilization: `${utilization}%`,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Live status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/live/events
 * Get recent events from the blockchain (last 9 blocks due to Alchemy limit)
 */
router.get('/events', async (req, res) => {
  try {
    const prov = getProvider();
    const comet = getContract();

    const currentBlock = await prov.getBlockNumber();
    const fromBlock = currentBlock - 9; // Alchemy free tier limit

    // Fetch logs
    const logs = await prov.getLogs({
      address: COMET_ADDRESS,
      fromBlock,
      toBlock: currentBlock,
    });

    // Parse events
    const events = [];
    for (const log of logs) {
      try {
        const parsed = comet.interface.parseLog({
          topics: log.topics,
          data: log.data,
        });

        if (parsed) {
          const block = await prov.getBlock(log.blockNumber);
          events.push({
            event: parsed.name,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            logIndex: log.index,
            timestamp: block ? new Date(Number(block.timestamp) * 1000).toISOString() : null,
            args: Object.fromEntries(
              parsed.fragment.inputs.map((input, i) => [
                input.name,
                parsed.args[i].toString(),
              ])
            ),
          });
        }
      } catch (e) {
        // Skip unparseable events
      }
    }

    res.json({
      success: true,
      data: {
        fromBlock,
        toBlock: currentBlock,
        eventCount: events.length,
        events,
      },
    });
  } catch (error) {
    console.error('Live events error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/live/events/history
 * Get events from a range of blocks (paginated, 9 blocks at a time)
 */
router.get('/events/history', async (req, res) => {
  try {
    const prov = getProvider();
    const comet = getContract();

    const currentBlock = await prov.getBlockNumber();
    const page = parseInt(req.query.page) || 1;
    const blocksPerPage = 9; // Alchemy free tier limit

    const toBlock = currentBlock - (page - 1) * blocksPerPage;
    const fromBlock = toBlock - blocksPerPage + 1;

    if (fromBlock < 0) {
      return res.json({
        success: true,
        data: { events: [], fromBlock: 0, toBlock: 0, eventCount: 0 },
      });
    }

    const logs = await prov.getLogs({
      address: COMET_ADDRESS,
      fromBlock,
      toBlock,
    });

    const events = [];
    for (const log of logs) {
      try {
        const parsed = comet.interface.parseLog({
          topics: log.topics,
          data: log.data,
        });

        if (parsed) {
          events.push({
            event: parsed.name,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            logIndex: log.index,
            args: Object.fromEntries(
              parsed.fragment.inputs.map((input, i) => [
                input.name,
                parsed.args[i].toString(),
              ])
            ),
          });
        }
      } catch (e) {
        // Skip
      }
    }

    res.json({
      success: true,
      data: {
        page,
        fromBlock,
        toBlock,
        currentBlock,
        eventCount: events.length,
        events,
      },
    });
  } catch (error) {
    console.error('Live events history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

