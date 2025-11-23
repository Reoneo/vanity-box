import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Chain configurations
const CHAINS = {
  ethereum: {
    name: 'Ethereum',
    apiUrl: 'https://api.etherscan.io/api',
    apiKey: Deno.env.get('ETHERSCAN_API_KEY'),
  },
  polygon: {
    name: 'Polygon',
    apiUrl: 'https://api.polygonscan.com/api',
    apiKey: Deno.env.get('POLYGONSCAN_API_KEY'),
  },
  arbitrum: {
    name: 'Arbitrum',
    apiUrl: 'https://api.arbiscan.io/api',
    apiKey: Deno.env.get('ARBISCAN_API_KEY'),
  },
  optimism: {
    name: 'Optimism',
    apiUrl: 'https://api-optimistic.etherscan.io/api',
    apiKey: Deno.env.get('OPTIMISM_ETHERSCAN_API_KEY'),
  },
  base: {
    name: 'Base',
    apiUrl: 'https://api.basescan.org/api',
    apiKey: Deno.env.get('BASESCAN_API_KEY'),
  },
  bsc: {
    name: 'BNB Chain',
    apiUrl: 'https://api.bscscan.com/api',
    apiKey: Deno.env.get('BSCSCAN_API_KEY'),
  },
  avalanche: {
    name: 'Avalanche',
    apiUrl: 'https://api.snowtrace.io/api',
    apiKey: Deno.env.get('SNOWTRACE_API_KEY'),
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address } = await req.json();
    
    console.log('🔍 Etherscan lookup request for address:', address);
    
    if (!address) {
      throw new Error('Address is required');
    }

    // Fetch transaction data from all chains in parallel
    const chainPromises = Object.entries(CHAINS).map(async ([chainKey, chain]) => {
      if (!chain.apiKey) {
        console.warn(`⚠️ ${chain.name} API key not configured, skipping...`);
        return null;
      }

      try {
        const url = `${chain.apiUrl}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc&apikey=${chain.apiKey}`;
        
        console.log(`📡 Calling ${chain.name} API...`);
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error(`❌ ${chain.name} API error:`, response.status);
          return null;
        }

        const data = await response.json();
        
        if (data.status === '1' && data.result && Array.isArray(data.result) && data.result.length > 0) {
          console.log(`✅ ${chain.name}: Found ${data.result.length} transactions`);
          return {
            chain: chain.name,
            chainKey,
            transactions: data.result.slice(0, 10).map((tx: any) => ({
              hash: tx.hash,
              from: tx.from,
              to: tx.to,
              value: tx.value,
              timestamp: parseInt(tx.timeStamp) * 1000,
              blockNumber: tx.blockNumber,
              gasUsed: tx.gasUsed,
              gasPrice: tx.gasPrice,
              isError: tx.isError === '1',
              methodId: tx.methodId,
            })),
            totalTransactions: data.result.length,
          };
        }
        
        console.log(`ℹ️ ${chain.name}: No transactions found`);
        return null;
      } catch (error) {
        console.error(`❌ Error fetching ${chain.name} transactions:`, error);
        return null;
      }
    });

    const results = await Promise.all(chainPromises);
    const validResults = results.filter(r => r !== null);

    console.log(`✅ Total chains with transactions: ${validResults.length}`);

    return new Response(JSON.stringify({
      address,
      chains: validResults,
      totalChains: validResults.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Error fetching Etherscan transactions:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
