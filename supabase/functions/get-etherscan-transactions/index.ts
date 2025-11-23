import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const etherscanApiKey = Deno.env.get('ETHERSCAN_API_KEY');
const V2_API_BASE = 'https://api.etherscan.io/v2/api';

// Rate limit: 3 calls per second for Etherscan V2
const RATE_LIMIT_DELAY = 350; // milliseconds between API calls
const BATCH_SIZE = 3; // Process 3 chains at a time

// Priority chain to fetch first
const PRIORITY_CHAIN = { name: 'World Chain', chainId: 480, key: 'worldchain' };

// All other chains
const OTHER_CHAINS = {
  ethereum: { name: 'Ethereum', chainId: 1 },
  polygon: { name: 'Polygon', chainId: 137 },
  arbitrum: { name: 'Arbitrum', chainId: 42161 },
  optimism: { name: 'Optimism', chainId: 10 },
  base: { name: 'Base', chainId: 8453 },
  bsc: { name: 'BNB Chain', chainId: 56 },
  avalanche: { name: 'Avalanche', chainId: 43114 },
  linea: { name: 'Linea', chainId: 59144 },
  scroll: { name: 'Scroll', chainId: 534352 },
  zksync: { name: 'zkSync Era', chainId: 324 },
  mantle: { name: 'Mantle', chainId: 5000 },
  mode: { name: 'Mode', chainId: 34443 },
  celo: { name: 'Celo', chainId: 42220 },
  gnosis: { name: 'Gnosis', chainId: 100 },
  fantom: { name: 'Fantom', chainId: 250 },
  moonriver: { name: 'Moonriver', chainId: 1285 },
  cronos: { name: 'Cronos', chainId: 25 },
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchChainData(address: string, chainKey: string, chain: { name: string; chainId: number }) {
  console.log(`📡 Calling ${chain.name} API (Chain ID: ${chain.chainId})...`);

  try {
    await sleep(RATE_LIMIT_DELAY);
    const balanceResponse = await fetch(`${V2_API_BASE}?chainid=${chain.chainId}&module=account&action=balance&address=${address}&tag=latest&apikey=${etherscanApiKey}`);
    
    await sleep(RATE_LIMIT_DELAY);
    const txResponse = await fetch(`${V2_API_BASE}?chainid=${chain.chainId}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey=${etherscanApiKey}`);
    
    await sleep(RATE_LIMIT_DELAY);
    const tokenTxResponse = await fetch(`${V2_API_BASE}?chainid=${chain.chainId}&module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey=${etherscanApiKey}`);
    
    await sleep(RATE_LIMIT_DELAY);
    const nftTxResponse = await fetch(`${V2_API_BASE}?chainid=${chain.chainId}&module=account&action=tokennfttx&address=${address}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey=${etherscanApiKey}`);
    
    await sleep(RATE_LIMIT_DELAY);
    const erc1155Response = await fetch(`${V2_API_BASE}?chainid=${chain.chainId}&module=account&action=token1155tx&address=${address}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey=${etherscanApiKey}`);
    
    await sleep(RATE_LIMIT_DELAY);
    const internalTxResponse = await fetch(`${V2_API_BASE}?chainid=${chain.chainId}&module=account&action=txlistinternal&address=${address}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey=${etherscanApiKey}`);

    const [balanceData, txData, tokenTxData, nftTxData, erc1155Data, internalTxData] = await Promise.all([
      balanceResponse.json(),
      txResponse.json(),
      tokenTxResponse.json(),
      nftTxResponse.json(),
      erc1155Response.json(),
      internalTxResponse.json()
    ]);
    
    console.log(`📦 ${chain.name} Balance:`, balanceData.result);
    
    const balance = balanceData.status === '1' ? balanceData.result : '0';
    const hasRegularTx = txData.status === '1' && Array.isArray(txData.result) && txData.result.length > 0;
    const hasTokenTx = tokenTxData.status === '1' && Array.isArray(tokenTxData.result) && tokenTxData.result.length > 0;
    const hasNftTx = nftTxData.status === '1' && Array.isArray(nftTxData.result) && nftTxData.result.length > 0;
    const hasErc1155 = erc1155Data.status === '1' && Array.isArray(erc1155Data.result) && erc1155Data.result.length > 0;
    const hasInternalTx = internalTxData.status === '1' && Array.isArray(internalTxData.result) && internalTxData.result.length > 0;
    
    const hasBalance = balance !== '0';
    
    if (!hasRegularTx && !hasTokenTx && !hasNftTx && !hasErc1155 && !hasInternalTx && !hasBalance) {
      console.log(`ℹ️ ${chain.name}: No activity found`);
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
      tokenName: tx.tokenName,
      tokenSymbol: tx.tokenSymbol,
      tokenDecimal: tx.tokenDecimal,
      contractAddress: tx.contractAddress,
      type: 'token'
    })) : [];

    const nftTransfers = hasNftTx ? nftTxData.result.map((tx: any) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      tokenID: tx.tokenID,
      tokenName: tx.tokenName,
      tokenSymbol: tx.tokenSymbol,
      contractAddress: tx.contractAddress,
      timestamp: parseInt(tx.timeStamp) * 1000,
      type: 'nft-721'
    })) : [];

    const erc1155Transfers = hasErc1155 ? erc1155Data.result.map((tx: any) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      tokenID: tx.tokenID,
      tokenValue: tx.tokenValue,
      tokenName: tx.tokenName,
      tokenSymbol: tx.tokenSymbol,
      contractAddress: tx.contractAddress,
      timestamp: parseInt(tx.timeStamp) * 1000,
      type: 'nft-1155'
    })) : [];

    const internalTransactions = hasInternalTx ? internalTxData.result.map((tx: any) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      timestamp: parseInt(tx.timeStamp) * 1000,
      isError: tx.isError === '1',
      type: 'internal'
    })) : [];

    console.log(`✅ ${chain.name}: Balance: ${balance}, TX: ${transactions.length}, Tokens: ${tokenTransfers.length}, NFTs: ${nftTransfers.length + erc1155Transfers.length}, Internal: ${internalTransactions.length}`);
    
    return {
      chain: chain.name,
      chainKey,
      balance,
      transactions,
      tokenTransfers,
      nftTransfers: [...nftTransfers, ...erc1155Transfers],
      internalTransactions,
      totalTransactions: transactions.length + tokenTransfers.length + nftTransfers.length + erc1155Transfers.length + internalTransactions.length,
    };
  } catch (error) {
    console.error(`❌ Error fetching ${chain.name} data:`, error);
    return null;
  }
}

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

    if (!etherscanApiKey) {
      console.warn(`⚠️ Etherscan API key not configured`);
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch World Chain data first
    console.log('🚀 Fetching World Chain data first...');
    const priorityResult = await fetchChainData(address, PRIORITY_CHAIN.key, PRIORITY_CHAIN);
    const initialResults = priorityResult ? [priorityResult] : [];

    // Start background task to fetch remaining chains
    const fetchRemainingChains = async () => {
      console.log('🔄 Starting background fetch for remaining chains...');
      const allResults: any[] = [...initialResults];
      const chainEntries = Object.entries(OTHER_CHAINS);
      
      for (let i = 0; i < chainEntries.length; i += BATCH_SIZE) {
        const batch = chainEntries.slice(i, i + BATCH_SIZE);
        
        const batchPromises = batch.map(([chainKey, chain]) => 
          fetchChainData(address, chainKey, chain)
        );

        const batchResults = await Promise.all(batchPromises);
        allResults.push(...batchResults);
        
        if (i + BATCH_SIZE < chainEntries.length) {
          await sleep(RATE_LIMIT_DELAY * 2);
        }
      }

      const validResults = allResults.filter(r => r !== null);
      console.log(`✅ Background fetch complete: ${validResults.length} chains with activity`);
      
      return validResults;
    };

    // Queue background task
    EdgeRuntime.waitUntil(fetchRemainingChains());

    // Return World Chain data immediately
    console.log(`✅ Returning initial World Chain data (${initialResults.length} chains)`);
    
    return new Response(JSON.stringify({
      address,
      chains: initialResults,
      totalChains: initialResults.length,
      partial: true, // Indicates more data is being fetched in background
      priority: 'worldchain'
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
