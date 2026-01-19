/**
 * Compound V3 (Comet) Contract Addresses and Configuration
 * 
 * Networks: Ethereum Sepolia Testnet & Mainnet
 * 
 * Sepolia WETH Market: 0x2943ac1216979aD8dB76D9147F64E61adc126e96
 * 
 * For additional Sepolia contracts (USDC market, Rewards, etc.),
 * check Compound's GitHub deployments or documentation.
 */

export const NETWORKS = {
  SEPOLIA: {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    rpcUrl: 'https://rpc.sepolia.org',
    blockExplorer: 'https://sepolia.etherscan.io',
  },
  ETHEREUM_MAINNET: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://eth.llamarpc.com',
    blockExplorer: 'https://etherscan.io',
  },
};

/**
 * Compound V3 Comet Contract Addresses
 * 
 * Sepolia:
 * - cWETHv3: 0x2943ac1216979aD8dB76D9147F64E61adc126e96
 * 
 * Mainnet:
 * - cUSDCv3: 0xc3d688B66703497DAA19211EEdff47f25384cdc3
 * - cWETHv3: 0xA17581A9E3356d9A858b789D68B4d866e593aE94
 * - cUSDTv3: 0x3Afdc9BCA9213A35503b077a6072F3D0d5AB0840
 */
export const COMET_CONTRACTS = {
  SEPOLIA: {
    // WETH Market (cWETHv3) - Sepolia
    cWETHv3: {
      proxy: '0x2943ac1216979aD8dB76D9147F64E61adc126e96',
      baseToken: {
        address: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', // Sepolia WETH
        symbol: 'WETH',
        decimals: 18,
      },
      deployBlock: 4500000, // Approximate deploy block - adjust if known
    },
    // USDC Market (cUSDCv3) - placeholder, add when available
    cUSDCv3: {
      proxy: '0x0000000000000000000000000000000000000000',
      baseToken: {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'USDC',
        decimals: 6,
      },
      deployBlock: 0,
    },
    // Common infrastructure contracts - add addresses when available
    configurator: '0x0000000000000000000000000000000000000000',
    configuratorProxy: '0x0000000000000000000000000000000000000000',
    proxyAdmin: '0x0000000000000000000000000000000000000000',
    cometFactory: '0x0000000000000000000000000000000000000000',
    rewards: '0x0000000000000000000000000000000000000000',
    bulker: '0x0000000000000000000000000000000000000000',
  },
  ETHEREUM_MAINNET: {
    // USDC Market
    cUSDCv3: {
      proxy: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
      baseToken: {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        symbol: 'USDC',
        decimals: 6,
      },
      deployBlock: 15331586,
    },
    // WETH Market
    cWETHv3: {
      proxy: '0xA17581A9E3356d9A858b789D68B4d866e593aE94',
      baseToken: {
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        symbol: 'WETH',
        decimals: 18,
      },
      deployBlock: 18040181,
    },
    // USDT Market
    cUSDTv3: {
      proxy: '0x3Afdc9BCA9213A35503b077a6072F3D0d5AB0840',
      baseToken: {
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        symbol: 'USDT',
        decimals: 6,
      },
      deployBlock: 19297761,
    },
    // Infrastructure contracts
    configurator: '0x316f9708bB98af7dA9c68C1C3b5e79039cD336E3',
    configuratorProxy: '0xcFC1fA6b7ca982176529899D99f0e67945355d63',
    proxyAdmin: '0x1EC63B5883C3481134FD50D5DAebc83Ecd2E8779',
    cometFactory: '0xa7F7De6cCad4D83d81676717053883337aC2c1b4',
    rewards: '0x1B0e765F6224C21223AeA2af16c1C46E38885a40',
    bulker: '0xa397a8C2086C554B531c02E29f3291c9704B00c7',
  },
};

/**
 * Get all trackable contract addresses for a network
 */
export function getTrackableContracts(network = 'SEPOLIA') {
  const contracts = COMET_CONTRACTS[network];
  const addresses = [];

  // Add market proxy addresses
  Object.entries(contracts).forEach(([key, value]) => {
    if (typeof value === 'object' && value.proxy) {
      addresses.push({
        type: 'market',
        name: key,
        address: value.proxy.toLowerCase(),
        baseToken: value.baseToken,
        deployBlock: value.deployBlock,
      });
    } else if (typeof value === 'string' && value !== '0x0000000000000000000000000000000000000000') {
      addresses.push({
        type: 'infrastructure',
        name: key,
        address: value.toLowerCase(),
      });
    }
  });

  return addresses;
}

export default COMET_CONTRACTS;

