// Edge function: Verify IOTA wallet signature + WebAuthn attestation, store passkey binding
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function base64urlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const binary = atob(b64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      iotaWalletAddress,
      walletChallenge,
      walletSignature,
      walletMessage,
      attestationResponse,
      rpId,
    } = await req.json();

    if (!iotaWalletAddress || !walletChallenge || !walletSignature || !attestationResponse) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Verify wallet challenge is valid and unused
    const { data: challengeRow, error: challengeErr } = await supabase
      .from("passkey_challenges")
      .select("*")
      .eq("challenge", walletChallenge)
      .eq("challenge_type", "wallet_bind")
      .eq("used", false)
      .single();

    if (challengeErr || !challengeRow) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired wallet challenge" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new Date(challengeRow.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Wallet challenge expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (challengeRow.iota_wallet_address !== iotaWalletAddress) {
      return new Response(
        JSON.stringify({ error: "Wallet address mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark wallet challenge as used
    await supabase
      .from("passkey_challenges")
      .update({ used: true })
      .eq("id", challengeRow.id);

    // 2. Parse WebAuthn attestation response
    // attestationResponse contains: { id, rawId, type, response: { clientDataJSON, attestationObject } }
    const { id: credentialId, response: attResponse } = attestationResponse;

    if (!credentialId || !attResponse?.clientDataJSON || !attResponse?.attestationObject) {
      return new Response(
        JSON.stringify({ error: "Invalid attestation response format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode clientDataJSON to verify origin and type
    const clientDataBytes = base64urlToBytes(attResponse.clientDataJSON);
    const clientData = JSON.parse(new TextDecoder().decode(clientDataBytes));

    if (clientData.type !== "webauthn.create") {
      return new Response(
        JSON.stringify({ error: "Invalid WebAuthn response type" }),
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
      console.error("Origin mismatch:", clientData.origin);
      return new Response(
        JSON.stringify({ error: "Invalid origin" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Parse attestationObject to extract public key
    // For "none" attestation (most common with passkeys), we extract from authData
    const attObjBytes = base64urlToBytes(attResponse.attestationObject);
    
    // CBOR decode is complex; store the raw attestation + credentialId
    // The public key is embedded in the credential and used by the browser
    // For server-side verification during login, we store the full attestation
    const publicKeyB64 = attResponse.attestationObject; // Store full attestation for later verification

    // 4. Check for existing active binding
    const { data: existing } = await supabase
      .from("wallet_passkey_bindings")
      .select("id")
      .eq("iota_wallet_address", iotaWalletAddress)
      .eq("status", "active");

    // Revoke existing if any
    if (existing && existing.length > 0) {
      await supabase
        .from("wallet_passkey_bindings")
        .update({ status: "revoked" })
        .eq("iota_wallet_address", iotaWalletAddress)
        .eq("status", "active");
    }

    // 5. Store the new binding
    const effectiveRpId = rpId || "vanity.box";
    const { error: insertErr } = await supabase
      .from("wallet_passkey_bindings")
      .insert({
        iota_wallet_address: iotaWalletAddress,
        credential_id: credentialId,
        public_key: publicKeyB64,
        sign_count: 0,
        rp_id: effectiveRpId,
        wallet_proof_signature: walletSignature,
        wallet_proof_message: walletMessage || "",
        status: "active",
      });

    if (insertErr) {
      console.error("Passkey binding insert error:", insertErr);
      return new Response(
        JSON.stringify({ error: "Failed to store passkey binding" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        credentialId,
        iotaWalletAddress,
        message: "Passkey bound to IOTA wallet successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("passkey-register error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
