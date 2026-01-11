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
    const projectId = Deno.env.get("VITE_WALLETCONNECT_PROJECT_ID") || Deno.env.get("WALLETCONNECT_PROJECT_ID");
    
    if (!projectId) {
      console.error("[get-walletconnect-config] No WalletConnect project ID found in secrets");
      return new Response(
        JSON.stringify({ error: "WalletConnect project ID not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[get-walletconnect-config] Returning project ID: ${projectId.substring(0, 10)}...`);

    return new Response(
      JSON.stringify({ projectId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[get-walletconnect-config] Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch WalletConnect config" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
