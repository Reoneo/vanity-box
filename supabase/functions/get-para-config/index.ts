import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paraApiKey = Deno.env.get("PARA_API_KEY");
    const walletConnectProjectId = Deno.env.get("VITE_WALLETCONNECT_PROJECT_ID");

    if (!paraApiKey) {
      console.error("PARA_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Para API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate WalletConnect project ID (should be 32 hex chars)
    const isValidWcProjectId = walletConnectProjectId && /^[a-f0-9]{32}$/i.test(walletConnectProjectId);
    
    if (!walletConnectProjectId) {
      console.warn("VITE_WALLETCONNECT_PROJECT_ID not configured - WalletConnect will be disabled");
    } else if (!isValidWcProjectId) {
      console.warn("VITE_WALLETCONNECT_PROJECT_ID appears invalid (expected 32 hex chars), got:", walletConnectProjectId.length, "chars");
    }

    console.log("Returning Para config (API key present:", !!paraApiKey, ", WC project ID valid:", isValidWcProjectId, ")");

    return new Response(
      JSON.stringify({
        apiKey: paraApiKey,
        walletConnectProjectId: isValidWcProjectId ? walletConnectProjectId : "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching Para config:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch Para config" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
