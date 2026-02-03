// Edge function to fetch IOTA transaction activity via Blockberry API
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BLOCKBERRY_API_URL = "https://api.blockberry.one/iota-mainnet";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress, page = 0, size = 50 } = await req.json();

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: "walletAddress is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("BLOCKBERRY_API_KEY");
    if (!apiKey) {
      console.error("BLOCKBERRY_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API not configured", transactions: [] }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[get-iota-transactions] Fetching activity for ${walletAddress}`);

    // Fetch account activities/transactions from Blockberry
    const url = `${BLOCKBERRY_API_URL}/v1/accounts/${walletAddress}/activities?page=${page}&size=${size}&orderBy=DESC`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "x-api-key": apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Blockberry activities API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `API error: ${response.status}`, transactions: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const activities = data?.content || data || [];
    
    console.log(`[get-iota-transactions] Found ${Array.isArray(activities) ? activities.length : 0} activities`);

    // Transform to standard transaction format
    const transactions = (Array.isArray(activities) ? activities : []).map((tx: any) => {
      const timestamp = tx.timestamp || tx.timestampMs;
      const date = timestamp ? new Date(typeof timestamp === 'number' ? timestamp : parseInt(timestamp)) : null;
      
      // Determine transaction type
      let type = tx.type || tx.transactionType || "UNKNOWN";
      if (type === "RECEIVE" || tx.to?.toLowerCase() === walletAddress.toLowerCase()) {
        type = "RECEIVE";
      } else if (type === "SEND" || tx.from?.toLowerCase() === walletAddress.toLowerCase()) {
        type = "SEND";
      }

      return {
        hash: tx.digest || tx.txHash || tx.transactionHash || tx.hash,
        type: type,
        status: tx.status || "success",
        timestamp: date?.toISOString() || null,
        timestampMs: timestamp,
        from: tx.sender || tx.from,
        to: tx.recipient || tx.to,
        amount: tx.amount || tx.value || "0",
        coinType: tx.coinType || tx.tokenType || "0x2::iota::IOTA",
        symbol: tx.symbol || tx.coinSymbol || "IOTA",
        fee: tx.gasFee || tx.fee || null,
        chain: "iota",
        functionName: tx.functionName || tx.function || null,
        packageId: tx.packageId || tx.package || null,
      };
    });

    // Pagination info
    const pagination = {
      page: data.page || page,
      size: data.size || size,
      totalPages: data.totalPages || 1,
      totalElements: data.totalElements || transactions.length,
      hasMore: data.hasNext || (transactions.length === size),
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
