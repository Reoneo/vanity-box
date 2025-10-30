// Utility to fetch World Chain gas prices
export interface GasPrice {
  gwei: number;
  lastUpdated: number;
}

let cachedGasPrice: GasPrice | null = null;
const CACHE_DURATION = 30000; // 30 seconds

export async function fetchWorldChainGasPrice(): Promise<number> {
  // Check cache first
  if (cachedGasPrice && Date.now() - cachedGasPrice.lastUpdated < CACHE_DURATION) {
    return cachedGasPrice.gwei;
  }

  try {
    // Fetch gas price from World Chain RPC
    const response = await fetch('https://worldchain-mainnet.g.alchemy.com/public', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_gasPrice',
        params: [],
        id: 1,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch gas price');
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'RPC error');
    }

    // Convert hex to wei, then to gwei
    const gasWei = parseInt(data.result, 16);
    const gasGwei = gasWei / 1e9;

    // Cache the result
    cachedGasPrice = {
      gwei: gasGwei,
      lastUpdated: Date.now(),
    };

    return gasGwei;
  } catch (error) {
    console.error('Error fetching World Chain gas price:', error);
    // Return a fallback value
    return 0.001; // Default fallback
  }
}

// Calculate network fee in USD based on gas price
export async function calculateNetworkFee(gasLimit: number = 100000): Promise<number> {
  const gasGwei = await fetchWorldChainGasPrice();
  const gasEth = (gasGwei * gasLimit) / 1e9;
  
  // Fetch ETH price from your crypto prices utility
  try {
    const { fetchCryptoPrices } = await import('./cryptoPrices');
    const prices = await fetchCryptoPrices();
    const ethPrice = prices.eth;
    return gasEth * ethPrice;
  } catch (e) {
    return 0.5; // Fallback network fee
  }
}
