import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { blake2b } from "https://esm.sh/@noble/hashes@1.7.1/blake2b";
import { bytesToHex } from "https://esm.sh/@noble/hashes@1.7.1/utils";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function hexFromBytes(buf: Uint8Array): string {
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^\\x|^0x/, "");
  const arr = new Uint8Array(clean.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
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

// ──── IOTA Address Derivation ────
const PASSKEY_FLAG = 0x06;
const IOTA_ADDRESS_LENGTH = 32;

function derivePasskeyIotaAddress(compressedPubKey: Uint8Array): string {
  if (compressedPubKey.length !== 33) {
    throw new Error(`Expected 33-byte compressed P-256 key, got ${compressedPubKey.length}`);
  }
  const input = new Uint8Array(1 + compressedPubKey.length);
  input[0] = PASSKEY_FLAG;
  input.set(compressedPubKey, 1);
  const hash = blake2b(input, { dkLen: 32 });
  const hex = bytesToHex(hash).slice(0, IOTA_ADDRESS_LENGTH * 2);
  return "0x" + hex.padStart(IOTA_ADDRESS_LENGTH * 2, "0");
}

/** Check if an address looks like a placeholder (not a real on-chain address) */
function isPlaceholderAddress(addr: string | null): boolean {
  if (!addr) return true;
  if (/^passkey/i.test(addr)) return true;
  if (/^pending/i.test(addr)) return true;
  if (/^wallet$/i.test(addr)) return true;
  if (/^unknown$/i.test(addr)) return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { challengeSessionId, origin, rpId, credential } = await req.json();

    if (!challengeSessionId || !origin || !rpId || !credential) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ALLOWED_ORIGINS.includes(origin)) {
      return new Response(
        JSON.stringify({ error: "Origin not allowed" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1) Parse clientDataJSON
    const clientDataJSON = JSON.parse(
      new TextDecoder().decode(b64urlDecode(credential.response.clientDataJSON))
    );

    if (clientDataJSON.type !== "webauthn.get") {
      return new Response(
        JSON.stringify({ error: "Invalid clientDataJSON type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (clientDataJSON.origin !== origin) {
      await supabase.rpc("passkey_audit", {
        p_event_type: "login_origin_mismatch",
        p_success: false,
        p_bind_session_id: challengeSessionId,
        p_metadata: { expected: origin, received: clientDataJSON.origin },
      });
      return new Response(
        JSON.stringify({ error: "Origin mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2) Consume challenge
    const challengeBytes = b64urlDecode(clientDataJSON.challenge);
    const challengeHash = await sha256(challengeBytes);

    const { error: consumeError } = await supabase.rpc("passkey_consume_challenge", {
      p_challenge_hash: `\\x${hexFromBytes(challengeHash)}`,
      p_challenge_type: "webauthn_login",
      p_bind_session_id: challengeSessionId,
      p_expected_origin: origin,
      p_expected_rp_id: rpId,
    });

    if (consumeError) {
      return new Response(
        JSON.stringify({ error: "Challenge invalid, expired, or already used" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3) Verify rpIdHash from authenticatorData
    const authenticatorData = b64urlDecode(credential.response.authenticatorData);
    const expectedRpIdHash = await sha256(new TextEncoder().encode(rpId));
    const rpIdHash = authenticatorData.subarray(0, 32);

    if (hexFromBytes(rpIdHash) !== hexFromBytes(expectedRpIdHash)) {
      await supabase.rpc("passkey_audit", {
        p_event_type: "login_rpid_mismatch",
        p_success: false,
        p_bind_session_id: challengeSessionId,
        p_metadata: { expected: hexFromBytes(expectedRpIdHash), received: hexFromBytes(rpIdHash) },
      });
      return new Response(
        JSON.stringify({ error: "RP ID hash mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4) Check UP and UV flags
    const flags = authenticatorData[32];
    if (!(flags & 0x01)) {
      return new Response(
        JSON.stringify({ error: "User presence not verified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!(flags & 0x04)) {
      return new Response(
        JSON.stringify({ error: "User verification not performed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5) Extract signCount
    const signCount =
      (authenticatorData[33] << 24) |
      (authenticatorData[34] << 16) |
      (authenticatorData[35] << 8) |
      authenticatorData[36];

    // 6) Find binding by credential ID and update sign count
    const credentialId = b64urlDecode(credential.rawId);

    const { data: updateResult, error: updateError } = await supabase.rpc("passkey_update_sign_count", {
      p_credential_id: `\\x${hexFromBytes(credentialId)}`,
      p_new_sign_count: signCount,
    });

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Credential not found or inactive" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let iotaWalletAddress = updateResult?.iota_wallet_address;

    // 7) Auto-migrate: if the stored address is a placeholder, derive the real address
    //    from the stored public key using the Passkey scheme
    if (isPlaceholderAddress(iotaWalletAddress) && updateResult?.public_key) {
      try {
        // public_key is stored as base64 in the RPC response
        const pubKeyBytes = typeof updateResult.public_key === "string"
          ? b64urlDecode(updateResult.public_key.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""))
          : null;

        if (pubKeyBytes && pubKeyBytes.length === 33) {
          const derivedAddress = derivePasskeyIotaAddress(pubKeyBytes);
          console.log(
            "[passkey-login-verify] Auto-migrating placeholder address:",
            iotaWalletAddress, "→", derivedAddress
          );
          iotaWalletAddress = derivedAddress;

          // Note: Updating the binding's wallet address in the DB would require a new RPC
          // For now, return the derived address and the client will use it
        }
      } catch (e) {
        console.error("[passkey-login-verify] Failed to auto-migrate address:", e);
      }
    }

    // Audit success
    await supabase.rpc("passkey_audit", {
      p_event_type: "passkey_login",
      p_success: true,
      p_user_id: updateResult?.user_id,
      p_iota_wallet_address: iotaWalletAddress,
      p_credential_id: `\\x${hexFromBytes(credentialId)}`,
      p_bind_session_id: challengeSessionId,
      p_metadata: { signCount, bindingLevel: updateResult?.binding_level },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        binding: {
          id: updateResult?.id,
          userId: updateResult?.user_id,
          iotaWalletAddress,
          signCount: updateResult?.sign_count,
          bindingLevel: updateResult?.binding_level,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("passkey-login-verify error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
