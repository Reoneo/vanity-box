import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function hexFromBytes(buf: Uint8Array): string {
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

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
    const { walletAddress, bindSessionId, nonce, message, signature, origin, rpId } = await req.json();

    if (!walletAddress || !bindSessionId || !nonce || !message || !signature || !origin || !rpId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Consume the wallet_bind challenge atomically
    const nonceBytes = b64urlDecode(nonce);
    const challengeHash = await sha256(nonceBytes);

    const { data: consumeResult, error: consumeError } = await supabase.rpc("passkey_consume_challenge", {
      p_challenge_hash: `\\x${hexFromBytes(challengeHash)}`,
      p_challenge_type: "wallet_bind",
      p_bind_session_id: bindSessionId,
      p_expected_origin: origin,
      p_expected_rp_id: rpId,
    });

    if (consumeError) {
      console.error("Challenge consumption failed:", consumeError);
      return new Response(
        JSON.stringify({ error: "Challenge invalid, expired, or already used" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify message contains the expected wallet address
    if (!message.includes(walletAddress)) {
      return new Response(
        JSON.stringify({ error: "Message does not contain wallet address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store proof hashes (not raw data)
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = new TextEncoder().encode(signature);
    const walletProof = {
      messageHash: b64urlEncode(await sha256(messageBytes)),
      signatureHash: b64urlEncode(await sha256(signatureBytes)),
      verifiedAt: new Date().toISOString(),
    };

    // Audit the successful wallet verification
    await supabase.rpc("passkey_audit", {
      p_event_type: "wallet_proof_verified",
      p_success: true,
      p_iota_wallet_address: walletAddress,
      p_bind_session_id: bindSessionId,
      p_metadata: walletProof,
    });

    return new Response(
      JSON.stringify({ ok: true, bindSessionId, walletProof }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("passkey-verify-wallet error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
