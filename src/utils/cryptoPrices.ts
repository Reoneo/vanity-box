// Utility for fetching real-time cryptocurrency prices from CoinGecko
export interface CryptoPrices {
  eth: number;
  wld: number;
  usdc: number;
}

export async function fetchCryptoPrices(): Promise<CryptoPrices> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,worldcoin-wld,usd-coin&vs_currencies=usd',
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch crypto prices');
    }

    const data = await response.json();
    
    return {
      eth: data.ethereum?.usd || 0,
      wld: data['worldcoin-wld']?.usd || 0,
      usdc: data['usd-coin']?.usd || 1.0,
    };
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    // Return fallback prices
    return {
      eth: 2500,
      wld: 2.0,
      usdc: 1.0,
    };
  }
}
