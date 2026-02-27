// Edge function: Verify WebAuthn assertion for passkey login, resolve IOTA wallet
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
    const { challenge, assertionResponse } = await req.json();

    if (!challenge || !assertionResponse) {
      return new Response(
        JSON.stringify({ error: "Missing challenge or assertionResponse" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Verify challenge
    const { data: challengeRow, error: chErr } = await supabase
      .from("passkey_challenges")
      .select("*")
      .eq("challenge", challenge)
      .eq("challenge_type", "webauthn_login")
      .eq("used", false)
      .single();

    if (chErr || !challengeRow) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired login challenge" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new Date(challengeRow.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Login challenge expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark challenge as used
    await supabase
      .from("passkey_challenges")
      .update({ used: true })
      .eq("id", challengeRow.id);

    // 2. Look up credential binding
    const { id: credentialId } = assertionResponse;
    if (!credentialId) {
      return new Response(
        JSON.stringify({ error: "No credential ID in assertion" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: binding, error: bindErr } = await supabase
      .from("wallet_passkey_bindings")
      .select("*")
      .eq("credential_id", credentialId)
      .eq("status", "active")
      .single();

    if (bindErr || !binding) {
      return new Response(
        JSON.stringify({ error: "No active passkey binding found for this credential" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Verify clientDataJSON
    const clientDataBytes = Uint8Array.from(
      atob(
        assertionResponse.response.clientDataJSON
          .replace(/-/g, "+")
          .replace(/_/g, "/")
          + "=".repeat((4 - (assertionResponse.response.clientDataJSON.length % 4)) % 4)
      ),
      (c: string) => c.charCodeAt(0)
    );
    const clientData = JSON.parse(new TextDecoder().decode(clientDataBytes));

    if (clientData.type !== "webauthn.get") {
      return new Response(
        JSON.stringify({ error: "Invalid assertion type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify origin
    const allowedOrigins = [
      "https://vanity.box",
      "https://www.vanity.box",
      "https://ens-vanity-hub.lovable.app",
      "https://id-preview--7531083c-c70e-4d19-bd87-5efe8beff8c5.lovable.app",
    ];
    if (!allowedOrigins.some(o => clientData.origin.startsWith(o))) {
      return new Response(
        JSON.stringify({ error: "Invalid origin" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Update sign count and last_used_at
    const newSignCount = (assertionResponse.response?.signCount ?? binding.sign_count + 1);
    await supabase
      .from("wallet_passkey_bindings")
      .update({
        sign_count: newSignCount,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", binding.id);

    // 5. Return the bound IOTA wallet address
    return new Response(
      JSON.stringify({
        success: true,
        iotaWalletAddress: binding.iota_wallet_address,
        credentialId: binding.credential_id,
        message: "Passkey login verified",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("passkey-login error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
