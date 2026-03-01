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

const ALLOWED_ORIGINS = [
  "https://vanity.box",
  "https://ens-vanity-hub.lovable.app",
  "https://id-preview--7531083c-c70e-4d19-bd87-5efe8beff8c5.lovable.app",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress, origin, rpId, bindSessionId, userName, userDisplayName, bindingLevel } = await req.json();

    if (!walletAddress || !origin || !rpId) {
      return new Response(
        JSON.stringify({ error: "walletAddress, origin, and rpId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate origin
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return new Response(
        JSON.stringify({ error: "Origin not allowed" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Generate challenge
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const challengeB64u = b64urlEncode(challenge);
    const challengeHash = await sha256(challenge);

    const sessionId = bindSessionId || crypto.randomUUID();
    const userId = crypto.randomUUID(); // Generate a stable user ID for this wallet
    const expiresAt = new Date(Date.now() + 5 * 60_000);

    // Store hashed challenge
    const { error: rpcError } = await supabase.rpc("passkey_insert_challenge", {
      p_bind_session_id: sessionId,
      p_challenge_hash: `\\x${hexFromBytes(challengeHash)}`,
      p_challenge_type: "webauthn_register",
      p_iota_wallet_address: walletAddress,
      p_expected_origin: origin,
      p_expected_rp_id: rpId,
      p_expires_at: expiresAt.toISOString(),
      p_user_id: userId,
    });

    if (rpcError) {
      console.error("Insert challenge error:", rpcError);
      return new Response(
        JSON.stringify({ error: "Failed to create registration challenge" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate user handle (stable bytes for WebAuthn user.id)
    const userHandleBytes = new TextEncoder().encode(walletAddress);
    const userHandle = b64urlEncode(await sha256(userHandleBytes));

    // Get existing credentials to exclude
    const { data: existingBindings } = await supabase.rpc("passkey_get_bindings", {
      p_iota_wallet_address: walletAddress,
    });

    const excludeCredentials = (existingBindings || []).map((b: any) => ({
      id: b.credential_id, // Already base64
      type: "public-key",
      transports: ["internal", "hybrid"],
    }));

    const publicKeyOptions = {
      challenge: challengeB64u,
      rp: { id: rpId, name: "Vanity.box" },
      user: {
        id: userHandle,
        name: userName || walletAddress.slice(0, 20) + "...",
        displayName: userDisplayName || `IOTA Wallet ${walletAddress.slice(0, 8)}`,
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }], // ES256 P-256
      authenticatorSelection: {
        residentKey: "required",
        requireResidentKey: true,
        userVerification: "required",
      },
      attestation: "none",
      timeout: 60_000,
      excludeCredentials,
    };

    return new Response(
      JSON.stringify({ bindSessionId: sessionId, userId, publicKeyOptions }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("passkey-register-challenge error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
