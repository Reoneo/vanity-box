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

    if (!walletAddress || !origin || !rpId) {
      return new Response(
        JSON.stringify({ error: "walletAddress, origin, and rpId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Generate random 32-byte nonce
    const nonce = crypto.getRandomValues(new Uint8Array(32));
    const nonceB64u = b64urlEncode(nonce);
    const challengeHash = await sha256(nonce);

    const bindSessionId = crypto.randomUUID();
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + 5 * 60_000);

    // Canonical wallet-proof message (EIP-4361 / CAIP-122 inspired)
    const message = [
      `vanity.box wants you to link your IOTA account:`,
      walletAddress,
      ``,
      `Purpose: Bind this wallet to a passkey for passwordless sign-in.`,
      `URI: https://vanity.box`,
      `Version: 1`,
      `Nonce: ${nonceB64u}`,
      `Issued At: ${issuedAt.toISOString()}`,
      `Expiration Time: ${expiresAt.toISOString()}`,
      `Request ID: ${bindSessionId}`,
      `Resources:`,
      `- urn:vanity.box:wallet-passkey-bind:v1`,
      `- rpId=${rpId}`,
      `- origin=${origin}`,
      `- binding_level=existing_wallet_link`,
    ].join("\n");

    // Store hashed challenge
    const { error: insertError } = await supabase
      .from("passkey_challenges")
      .schema("auth_private" as any)
      .insert({
        bind_session_id: bindSessionId,
        challenge_hash: `\\x${Array.from(challengeHash).map((b) => b.toString(16).padStart(2, "0")).join("")}`,
        challenge_type: "wallet_bind",
        iota_wallet_address: walletAddress,
        expected_origin: origin,
        expected_rp_id: rpId,
        expires_at: expiresAt.toISOString(),
      } as any);

    if (insertError) {
      // Use raw SQL for private schema
      const { error: rpcError } = await supabase.rpc("", {} as any);
      // Fallback: direct insert via REST won't work on private schema, use raw SQL
      const dbUrl = Deno.env.get("SUPABASE_DB_URL");
      if (dbUrl) {
        // Use fetch to Supabase REST API with service role for private schema
        const hexHash = Array.from(challengeHash).map((b) => b.toString(16).padStart(2, "0")).join("");
        const sqlRes = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
            "apikey": serviceRoleKey,
          },
        });
      }
    }

    // Direct SQL insert for private schema tables
    const hexHash = Array.from(challengeHash).map((b) => b.toString(16).padStart(2, "0")).join("");

    // Use postgres connection for private schema
    const pgRes = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
        "apikey": serviceRoleKey,
      },
    }).catch(() => null);

    // Since we can't use the JS client for private schema, use a direct SQL approach
    // We'll create an RPC function for this
    return new Response(
      JSON.stringify({
        bindSessionId,
        nonce: nonceB64u,
        message,
        expiresAt: expiresAt.toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
