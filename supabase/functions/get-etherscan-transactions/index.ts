import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const etherscanApiKey = Deno.env.get('ETHERSCAN_API_KEY');
const V2_API_BASE = 'https://api.etherscan.io/v2/api';

// Rate limit: 3 calls per second for Etherscan V2
const RATE_LIMIT_DELAY = 350; // milliseconds between API calls
const BATCH_SIZE = 3; // Process 3 chains at a time

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

// Utility function for rate limiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

    const allResults: any[] = [];
    const chainEntries = Object.entries(CHAINS);
    
    // Process chains in batches to respect rate limits
    for (let i = 0; i < chainEntries.length; i += BATCH_SIZE) {
      const batch = chainEntries.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async ([chainKey, chain]) => {
        console.log(`📡 Calling ${chain.name} API (Chain ID: ${chain.chainId})...`);

        try {
          // Fetch balance first with rate limiting
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

          if (!txResponse.ok) {
            console.error(`❌ ${chain.name} API HTTP error`);
            return null;
          }

          const [balanceData, txData, tokenTxData, nftTxData, erc1155Data, internalTxData] = await Promise.all([
            balanceResponse.json(),
            txResponse.json(),
            tokenTxResponse.json(),
            nftTxResponse.json(),
            erc1155Response.json(),
            internalTxResponse.json()
          ]);
          
          console.log(`📦 ${chain.name} Balance:`, balanceData.result);
          console.log(`📦 ${chain.name} Regular TX:`, JSON.stringify({
            status: txData.status,
            count: Array.isArray(txData.result) ? txData.result.length : 0,
          }));
          
          const balance = balanceData.status === '1' ? balanceData.result : '0';
          const hasRegularTx = txData.status === '1' && Array.isArray(txData.result) && txData.result.length > 0;
          const hasTokenTx = tokenTxData.status === '1' && Array.isArray(tokenTxData.result) && tokenTxData.result.length > 0;
          const hasNftTx = nftTxData.status === '1' && Array.isArray(nftTxData.result) && nftTxData.result.length > 0;
          const hasErc1155 = erc1155Data.status === '1' && Array.isArray(erc1155Data.result) && erc1155Data.result.length > 0;
          const hasInternalTx = internalTxData.status === '1' && Array.isArray(internalTxData.result) && internalTxData.result.length > 0;
          
          const hasBalance = balance !== '0';
          
          // Show chain if it has balance OR transactions
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
      });

      const batchResults = await Promise.all(batchPromises);
      allResults.push(...batchResults);
      
      // Add delay between batches
      if (i + BATCH_SIZE < chainEntries.length) {
        await sleep(RATE_LIMIT_DELAY * 2);
      }
    }

    const validResults = allResults.filter(r => r !== null);

    console.log(`✅ Total chains with activity: ${validResults.length}`);

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
