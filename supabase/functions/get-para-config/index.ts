import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Infer environment from API key prefix
 * Para keys typically start with "beta_" or "prod_"
 */
function inferEnvFromApiKey(apiKey: string): "BETA" | "PROD" {
  const key = apiKey.trim().toLowerCase();
  if (key.startsWith("prod")) return "PROD";
  return "BETA";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // PARA_API_KEY = public/client key for frontend SDK
    // PARA_SECRET_KEY = server-only key (NOT returned to frontend)
    const paraApiKey = Deno.env.get("PARA_API_KEY");
    const walletConnectProjectId = Deno.env.get("VITE_WALLETCONNECT_PROJECT_ID") || Deno.env.get("WALLETCONNECT_PROJECT_ID");

    if (!paraApiKey) {
      console.error("PARA_API_KEY not found in secrets");
      return new Response(
        JSON.stringify({ error: "Para API key not configured in secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const env = inferEnvFromApiKey(paraApiKey);
    console.log(`Para config: env=${env}, key prefix=${paraApiKey.substring(0, 10)}...`);

    return new Response(
      JSON.stringify({
        paraApiKey,
        walletConnectProjectId: walletConnectProjectId || "",
        env,
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
