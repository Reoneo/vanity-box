import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const etherscanApiKey = Deno.env.get('ETHERSCAN_API_KEY');
const V2_API_BASE = 'https://api.etherscan.io/v2/api';

// Only fetch World Chain data
const WORLD_CHAIN = { name: 'World Chain', chainId: 480, key: 'worldchain' };

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWorldChainData(address: string) {
  console.log(`📡 Calling World Chain API (Chain ID: ${WORLD_CHAIN.chainId})...`);

  try {
    await sleep(350);
    const balanceResponse = await fetch(`${V2_API_BASE}?chainid=${WORLD_CHAIN.chainId}&module=account&action=balance&address=${address}&tag=latest&apikey=${etherscanApiKey}`);
    
    await sleep(350);
    const txResponse = await fetch(`${V2_API_BASE}?chainid=${WORLD_CHAIN.chainId}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=1000&sort=asc&apikey=${etherscanApiKey}`);
    
    await sleep(350);
    const tokenTxResponse = await fetch(`${V2_API_BASE}?chainid=${WORLD_CHAIN.chainId}&module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&page=1&offset=1000&sort=asc&apikey=${etherscanApiKey}`);
    
    await sleep(350);
    const nftTxResponse = await fetch(`${V2_API_BASE}?chainid=${WORLD_CHAIN.chainId}&module=account&action=tokennfttx&address=${address}&startblock=0&endblock=99999999&page=1&offset=1000&sort=asc&apikey=${etherscanApiKey}`);
    
    await sleep(350);
    const erc1155Response = await fetch(`${V2_API_BASE}?chainid=${WORLD_CHAIN.chainId}&module=account&action=token1155tx&address=${address}&startblock=0&endblock=99999999&page=1&offset=1000&sort=asc&apikey=${etherscanApiKey}`);
    
    await sleep(350);
    const internalTxResponse = await fetch(`${V2_API_BASE}?chainid=${WORLD_CHAIN.chainId}&module=account&action=txlistinternal&address=${address}&startblock=0&endblock=99999999&page=1&offset=1000&sort=asc&apikey=${etherscanApiKey}`);

    const [balanceData, txData, tokenTxData, nftTxData, erc1155Data, internalTxData] = await Promise.all([
      balanceResponse.json(),
      txResponse.json(),
      tokenTxResponse.json(),
      nftTxResponse.json(),
      erc1155Response.json(),
      internalTxResponse.json()
    ]);
    
    console.log(`📦 World Chain Balance:`, balanceData.result);
    
    const balance = balanceData.status === '1' ? balanceData.result : '0';
    const hasRegularTx = txData.status === '1' && Array.isArray(txData.result) && txData.result.length > 0;
    const hasTokenTx = tokenTxData.status === '1' && Array.isArray(tokenTxData.result) && tokenTxData.result.length > 0;
    const hasNftTx = nftTxData.status === '1' && Array.isArray(nftTxData.result) && nftTxData.result.length > 0;
    const hasErc1155 = erc1155Data.status === '1' && Array.isArray(erc1155Data.result) && erc1155Data.result.length > 0;
    const hasInternalTx = internalTxData.status === '1' && Array.isArray(internalTxData.result) && internalTxData.result.length > 0;
    
    const hasBalance = balance !== '0';
    
    if (!hasRegularTx && !hasTokenTx && !hasNftTx && !hasErc1155 && !hasInternalTx && !hasBalance) {
      console.log(`ℹ️ World Chain: No activity found`);
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

    // Find earliest transaction
    const allTransactions = [
      ...transactions,
      ...tokenTransfers,
      ...nftTransfers,
      ...erc1155Transfers,
      ...internalTransactions
    ];
    
    const firstTransaction = allTransactions.length > 0 
      ? allTransactions.reduce((earliest, tx) => 
          tx.timestamp < earliest.timestamp ? tx : earliest
        )
      : null;

    console.log(`✅ World Chain: Balance: ${balance}, TX: ${transactions.length}, Tokens: ${tokenTransfers.length}, NFTs: ${nftTransfers.length + erc1155Transfers.length}, Internal: ${internalTransactions.length}`);
    console.log(`📅 First transaction timestamp:`, firstTransaction?.timestamp);
    
    return {
      chain: WORLD_CHAIN.name,
      chainKey: WORLD_CHAIN.key,
      balance,
      transactions,
      tokenTransfers,
      nftTransfers: [...nftTransfers, ...erc1155Transfers],
      internalTransactions,
      totalTransactions: transactions.length + tokenTransfers.length + nftTransfers.length + erc1155Transfers.length + internalTransactions.length,
      firstTransactionDate: firstTransaction?.timestamp || null,
    };
  } catch (error) {
    console.error(`❌ Error fetching World Chain data:`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address } = await req.json();
    
    console.log('🔍 World Chain lookup request for address:', address);
    
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

    // Fetch World Chain data only
    console.log('🚀 Fetching World Chain data...');
    const worldChainData = await fetchWorldChainData(address);
    const results = worldChainData ? [worldChainData] : [];

    console.log(`✅ World Chain data fetched: ${results.length} chain(s) with activity`);
    
    return new Response(JSON.stringify({
      address,
      chains: results,
      totalChains: results.length,
      firstTransactionDate: worldChainData?.firstTransactionDate || null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Error fetching World Chain transactions:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
