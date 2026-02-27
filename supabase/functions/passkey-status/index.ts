// Edge function: Check passkey binding status for a wallet address
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { iotaWalletAddress } = await req.json();

    if (!iotaWalletAddress) {
      return new Response(
        JSON.stringify({ error: "iotaWalletAddress required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: bindings, error } = await supabase
      .from("wallet_passkey_bindings")
      .select("id, credential_id, created_at, last_used_at, rp_id")
      .eq("iota_wallet_address", iotaWalletAddress)
      .eq("status", "active");

    if (error) {
      console.error("Passkey status error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to check passkey status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        hasBoundPasskey: (bindings?.length ?? 0) > 0,
        bindings: bindings ?? [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("passkey-status error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
