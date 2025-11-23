import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Single Etherscan V2 API key that covers all networks
const etherscanApiKey = Deno.env.get('ETHERSCAN_API_KEY');

// Chain configurations
const CHAINS = {
  ethereum: {
    name: 'Ethereum',
    apiUrl: 'https://api.etherscan.io/api',
    apiKey: etherscanApiKey,
  },
  polygon: {
    name: 'Polygon',
    apiUrl: 'https://api.polygonscan.com/api',
    apiKey: etherscanApiKey,
  },
  arbitrum: {
    name: 'Arbitrum',
    apiUrl: 'https://api.arbiscan.io/api',
    apiKey: etherscanApiKey,
  },
  optimism: {
    name: 'Optimism',
    apiUrl: 'https://api-optimistic.etherscan.io/api',
    apiKey: etherscanApiKey,
  },
  base: {
    name: 'Base',
    apiUrl: 'https://api.basescan.org/api',
    apiKey: etherscanApiKey,
  },
  bsc: {
    name: 'BNB Chain',
    apiUrl: 'https://api.bscscan.com/api',
    apiKey: etherscanApiKey,
  },
  avalanche: {
    name: 'Avalanche',
    apiUrl: 'https://api.snowtrace.io/api',
    apiKey: etherscanApiKey,
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
        console.log(`🔗 API URL: ${url.replace(chain.apiKey || '', 'HIDDEN_API_KEY')}`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error(`❌ ${chain.name} API HTTP error:`, response.status, response.statusText);
          const errorText = await response.text();
          console.error(`❌ ${chain.name} API error response:`, errorText);
          return null;
        }

        const data = await response.json();
        
        // Log the full API response for debugging
        console.log(`📦 ${chain.name} API Response:`, JSON.stringify({
          status: data.status,
          message: data.message,
          resultCount: Array.isArray(data.result) ? data.result.length : 'not an array',
          resultType: typeof data.result,
        }));
        
        // Check for API-specific error messages
        if (data.message && data.message !== 'OK') {
          console.warn(`⚠️ ${chain.name} API message: ${data.message}`);
          
          // Handle common API errors
          if (data.message.includes('rate limit')) {
            console.error(`🚫 ${chain.name}: Rate limit exceeded`);
          } else if (data.message.includes('Invalid API Key')) {
            console.error(`🚫 ${chain.name}: Invalid API Key`);
          } else if (data.message.includes('No transactions found')) {
            console.log(`ℹ️ ${chain.name}: No transactions found (API message)`);
          }
        }
        
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
        
        console.log(`ℹ️ ${chain.name}: No transactions found (status: ${data.status}, result type: ${typeof data.result})`);
        return null;
      } catch (error) {
        console.error(`❌ Error fetching ${chain.name} transactions:`, error);
        console.error(`❌ ${chain.name} Error details:`, error instanceof Error ? error.message : 'Unknown error');
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
