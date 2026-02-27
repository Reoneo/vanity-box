// Edge function: Generate challenges for passkey bind and login flows
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
    const { type, iotaWalletAddress } = await req.json();

    if (!type || !["wallet_bind", "webauthn_register", "webauthn_login"].includes(type)) {
      return new Response(
        JSON.stringify({ error: "Invalid challenge type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For wallet_bind and webauthn_register, require wallet address
    if ((type === "wallet_bind" || type === "webauthn_register") && !iotaWalletAddress) {
      return new Response(
        JSON.stringify({ error: "iotaWalletAddress required for this challenge type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Generate 32-byte random challenge (base64url encoded)
    const challengeBytes = new Uint8Array(32);
    crypto.getRandomValues(challengeBytes);
    const challenge = btoa(String.fromCharCode(...challengeBytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // 5 minute expiry
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Clean up expired challenges
    await supabase
      .from("passkey_challenges")
      .delete()
      .lt("expires_at", new Date().toISOString());

    // Store challenge
    const { error: insertError } = await supabase
      .from("passkey_challenges")
      .insert({
        challenge,
        challenge_type: type,
        iota_wallet_address: iotaWalletAddress || null,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("Challenge insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create challenge" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For wallet_bind, check if already has a passkey
    let hasExistingPasskey = false;
    if (type === "wallet_bind" && iotaWalletAddress) {
      const { data: existing } = await supabase
        .from("wallet_passkey_bindings")
        .select("id")
        .eq("iota_wallet_address", iotaWalletAddress)
        .eq("status", "active")
        .limit(1);
      hasExistingPasskey = (existing?.length ?? 0) > 0;
    }

    return new Response(
      JSON.stringify({
        challenge,
        expiresAt,
        hasExistingPasskey,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("passkey-challenge error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
