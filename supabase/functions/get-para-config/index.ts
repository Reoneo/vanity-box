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
    // These are publishable keys - safe to expose to frontend
    const paraApiKey = Deno.env.get("VITE_PARA_API_KEY") || Deno.env.get("PARA_API_KEY");
    const walletConnectProjectId = Deno.env.get("VITE_WALLETCONNECT_PROJECT_ID") || Deno.env.get("WALLETCONNECT_PROJECT_ID");

    if (!paraApiKey) {
      return new Response(
        JSON.stringify({ error: "Para API key not configured in secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        paraApiKey,
        walletConnectProjectId: walletConnectProjectId || "",
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
