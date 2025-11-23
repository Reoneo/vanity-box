import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Single Etherscan V2 API key that covers all networks
const etherscanApiKey = Deno.env.get('ETHERSCAN_API_KEY');

// V2 API base URL
const V2_API_BASE = 'https://api.etherscan.io/v2/api';

// Chain configurations with V2 chain IDs
const CHAINS = {
  ethereum: { name: 'Ethereum', chainId: 1 },
  polygon: { name: 'Polygon', chainId: 137 },
  arbitrum: { name: 'Arbitrum', chainId: 42161 },
  optimism: { name: 'Optimism', chainId: 10 },
  base: { name: 'Base', chainId: 8453 },
  bsc: { name: 'BNB Chain', chainId: 56 },
  avalanche: { name: 'Avalanche', chainId: 43114 },
  worldchain: { name: 'World Chain', chainId: 480 },
  linea: { name: 'Linea', chainId: 59144 },
  scroll: { name: 'Scroll', chainId: 534352 },
  zksync: { name: 'zkSync Era', chainId: 324 },
  polygonzkevm: { name: 'Polygon zkEVM', chainId: 1101 },
  mantle: { name: 'Mantle', chainId: 5000 },
  blast: { name: 'Blast', chainId: 81457 },
  mode: { name: 'Mode', chainId: 34443 },
  celo: { name: 'Celo', chainId: 42220 },
  gnosis: { name: 'Gnosis', chainId: 100 },
  fantom: { name: 'Fantom', chainId: 250 },
  moonbeam: { name: 'Moonbeam', chainId: 1284 },
  moonriver: { name: 'Moonriver', chainId: 1285 },
  cronos: { name: 'Cronos', chainId: 25 },
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
      if (!etherscanApiKey) {
        console.warn(`⚠️ Etherscan API key not configured, skipping all chains...`);
        return null;
      }

      try {
        // Fetch both regular transactions and ERC-20 token transfers
        const [txResponse, tokenTxResponse] = await Promise.all([
          // Regular transactions
          fetch(`${V2_API_BASE}?chainid=${chain.chainId}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey=${etherscanApiKey}`),
          // ERC-20 token transfers
          fetch(`${V2_API_BASE}?chainid=${chain.chainId}&module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey=${etherscanApiKey}`)
        ]);
        
        console.log(`📡 Calling ${chain.name} API (Chain ID: ${chain.chainId})...`);
        
        if (!txResponse.ok || !tokenTxResponse.ok) {
          console.error(`❌ ${chain.name} API HTTP error`);
          return null;
        }

        const [txData, tokenTxData] = await Promise.all([
          txResponse.json(),
          tokenTxResponse.json()
        ]);
        
        console.log(`📦 ${chain.name} Regular TX Response:`, JSON.stringify({
          status: txData.status,
          message: txData.message,
          resultCount: Array.isArray(txData.result) ? txData.result.length : 'not an array',
        }));
        
        console.log(`📦 ${chain.name} Token TX Response:`, JSON.stringify({
          status: tokenTxData.status,
          message: tokenTxData.message,
          resultCount: Array.isArray(tokenTxData.result) ? tokenTxData.result.length : 'not an array',
        }));
        
        const hasRegularTx = txData.status === '1' && Array.isArray(txData.result) && txData.result.length > 0;
        const hasTokenTx = tokenTxData.status === '1' && Array.isArray(tokenTxData.result) && tokenTxData.result.length > 0;
        
        if (!hasRegularTx && !hasTokenTx) {
          console.log(`ℹ️ ${chain.name}: No transactions found`);
          return null;
        }

        const transactions = hasRegularTx ? txData.result.map((tx: any) => ({
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
          type: 'transaction'
        })) : [];

        const tokenTransfers = hasTokenTx ? tokenTxData.result.map((tx: any) => ({
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          timestamp: parseInt(tx.timeStamp) * 1000,
          blockNumber: tx.blockNumber,
          gasUsed: tx.gasUsed,
          gasPrice: tx.gasPrice,
          tokenName: tx.tokenName,
          tokenSymbol: tx.tokenSymbol,
          tokenDecimal: tx.tokenDecimal,
          contractAddress: tx.contractAddress,
          type: 'token'
        })) : [];

        console.log(`✅ ${chain.name}: Found ${transactions.length} regular tx, ${tokenTransfers.length} token transfers`);
        
        return {
          chain: chain.name,
          chainKey,
          transactions,
          tokenTransfers,
          totalTransactions: transactions.length + tokenTransfers.length,
        };
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
