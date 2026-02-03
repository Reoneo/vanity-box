// Edge function to fetch IOTA transaction activity via native IOTA JSON-RPC API
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IOTA_RPC_URL = "https://api.mainnet.iota.cafe";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress, cursor = null, limit = 20 } = await req.json();

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: "walletAddress is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[get-iota-transactions] Fetching transactions for ${walletAddress}`);

    // Use IOTA native RPC to query transaction blocks
    const response = await fetch(IOTA_RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "iotax_queryTransactionBlocks",
        params: [
          {
            filter: {
              FromAddress: walletAddress,
            },
            options: {
              showInput: true,
              showEffects: true,
              showEvents: true,
              showBalanceChanges: true,
            },
          },
          cursor,
          limit,
          true, // descending order (newest first)
        ],
      }),
    });

    if (!response.ok) {
      console.error("IOTA RPC error:", response.status);
      return new Response(
        JSON.stringify({ error: `RPC error: ${response.status}`, transactions: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    if (data.error) {
      console.error("IOTA RPC error:", data.error);
      return new Response(
        JSON.stringify({ error: data.error.message, transactions: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const txBlocks = data.result?.data || [];
    const nextCursor = data.result?.nextCursor || null;
    const hasNextPage = data.result?.hasNextPage || false;
    
    console.log(`[get-iota-transactions] Found ${txBlocks.length} transactions`);

    // Transform to standard transaction format
    const transactions = txBlocks.map((tx: any) => {
      const timestampMs = tx.timestampMs;
      const date = timestampMs ? new Date(parseInt(timestampMs)) : null;
      const effects = tx.effects || {};
      const status = effects.status?.status === "success" ? "success" : "failed";
      
      // Get gas fee from effects
      const gasUsed = effects.gasUsed || {};
      const totalGas = BigInt(gasUsed.computationCost || "0") + 
                       BigInt(gasUsed.storageCost || "0") - 
                       BigInt(gasUsed.storageRebate || "0");
      const gasFee = Number(totalGas) / 1e9; // Convert to IOTA
      
      // Determine transaction type from balance changes
      const balanceChanges = tx.balanceChanges || [];
      let type = "UNKNOWN";
      let amount = "0";
      let coinType = "0x2::iota::IOTA";
      
      for (const change of balanceChanges) {
        const changeAmount = BigInt(change.amount || "0");
        if (change.owner?.AddressOwner === walletAddress) {
          if (changeAmount < 0) {
            type = "SEND";
            amount = (Number(-changeAmount) / 1e9).toString();
            coinType = change.coinType || coinType;
          } else if (changeAmount > 0) {
            type = "RECEIVE";
            amount = (Number(changeAmount) / 1e9).toString();
            coinType = change.coinType || coinType;
          }
          break;
        }
      }

      return {
        hash: tx.digest,
        type: type,
        status: status,
        timestamp: date?.toISOString() || null,
        timestampMs: timestampMs,
        from: walletAddress,
        to: null, // Would need to parse transaction input for recipient
        amount: amount,
        coinType: coinType,
        symbol: coinType.includes("::iota::IOTA") ? "IOTA" : coinType.split("::").pop() || "UNKNOWN",
        fee: gasFee.toFixed(9),
        chain: "iota",
        functionName: null,
        packageId: null,
      };
    });

    // Pagination info
    const pagination = {
      cursor: nextCursor,
      hasMore: hasNextPage,
      count: transactions.length,
    };

    return new Response(
      JSON.stringify({
        transactions,
        pagination,
        walletAddress,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[get-iota-transactions] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to fetch transactions", transactions: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
