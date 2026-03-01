import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function b64urlEncode(buf: Uint8Array): string {
  const bin = Array.from(buf).map((b) => String.fromCharCode(b)).join("");
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function hexFromBytes(buf: Uint8Array): string {
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hash);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress, origin, rpId } = await req.json();

    if (!origin || !rpId) {
      return new Response(
        JSON.stringify({ error: "origin and rpId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const challengeB64u = b64urlEncode(challenge);
    const challengeHash = await sha256(challenge);

    const challengeSessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60_000);

    // Store challenge
    const { error: rpcError } = await supabase.rpc("passkey_insert_challenge", {
      p_bind_session_id: challengeSessionId,
      p_challenge_hash: `\\x${hexFromBytes(challengeHash)}`,
      p_challenge_type: "webauthn_login",
      p_iota_wallet_address: walletAddress || null,
      p_expected_origin: origin,
      p_expected_rp_id: rpId,
      p_expires_at: expiresAt.toISOString(),
    });

    if (rpcError) {
      console.error("Insert login challenge error:", rpcError);
      return new Response(
        JSON.stringify({ error: "Failed to create login challenge" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build allowCredentials if wallet address provided
    let allowCredentials: any[] = [];
    if (walletAddress) {
      const { data: bindings } = await supabase.rpc("passkey_get_bindings", {
        p_iota_wallet_address: walletAddress,
      });
      if (bindings && Array.isArray(bindings)) {
        allowCredentials = bindings.map((b: any) => ({
          id: b.credential_id,
          type: "public-key",
          transports: ["internal", "hybrid"],
        }));
      }
    }

    // Anti-enumeration: always return same response shape
    const publicKeyOptions = {
      challenge: challengeB64u,
      rpId,
      allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
      userVerification: "required",
      timeout: 60_000,
    };

    return new Response(
      JSON.stringify({ challengeSessionId, publicKeyOptions }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("passkey-login-challenge error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
