import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

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

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hash);
}

const ALLOWED_ORIGINS = [
  "https://vanity.box",
  "https://ens-vanity-hub.lovable.app",
  "https://id-preview--7531083c-c70e-4d19-bd87-5efe8beff8c5.lovable.app",
];

// P-256 SPKI header (26 bytes)
const SPKI_HEADER_HEX = "3059301306072a8648ce3d020106082a8648ce3d030107034200";

function compressP256(uncompressed65: Uint8Array): Uint8Array {
  if (uncompressed65.length !== 65 || uncompressed65[0] !== 0x04) {
    throw new Error("Expected uncompressed P-256 point (65 bytes, 0x04 prefix)");
  }
  const x = uncompressed65.subarray(1, 33);
  const y = uncompressed65.subarray(33, 65);
  const prefix = (y[31] & 1) === 0 ? 0x02 : 0x03;
  const compressed = new Uint8Array(33);
  compressed[0] = prefix;
  compressed.set(x, 1);
  return compressed;
}

function parseSpkiToCompressed(spkiB64u: string): Uint8Array {
  const der = b64urlDecode(spkiB64u);
  if (der.length !== 91) {
    throw new Error(`Unexpected SPKI length: ${der.length}`);
  }
  // Verify header
  const headerHex = hexFromBytes(der.subarray(0, 26));
  if (headerHex !== SPKI_HEADER_HEX) {
    throw new Error("Unexpected SPKI header");
  }
  const uncompressed = der.subarray(26);
  return compressP256(uncompressed);
}

// Minimal CBOR COSE key parser for ES256
function parseCoseKeyFromAuthData(authData: Uint8Array): {
  credentialId: Uint8Array;
  compressedPubKey: Uint8Array;
  aaguid: string;
  signCount: number;
} {
  const flags = authData[32];
  const signCount = (authData[33] << 24) | (authData[34] << 16) | (authData[35] << 8) | authData[36];
  const atFlag = (flags & 0x40) !== 0;
  if (!atFlag) throw new Error("No attested credential data");

  let offset = 37;
  const aaguidBytes = authData.slice(offset, offset + 16);
  const aaguid = [
    hexFromBytes(aaguidBytes.subarray(0, 4)),
    hexFromBytes(aaguidBytes.subarray(4, 6)),
    hexFromBytes(aaguidBytes.subarray(6, 8)),
    hexFromBytes(aaguidBytes.subarray(8, 10)),
    hexFromBytes(aaguidBytes.subarray(10, 16)),
  ].join("-");
  offset += 16;

  const credIdLen = (authData[offset] << 8) | authData[offset + 1];
  offset += 2;
  const credentialId = authData.slice(offset, offset + credIdLen);
  offset += credIdLen;

  // Parse COSE key - find x (-2) and y (-3)
  const coseData = authData.slice(offset);
  let x: Uint8Array | null = null;
  let y: Uint8Array | null = null;

  // Simple CBOR map parser
  let pos = 0;
  const initial = coseData[pos++];
  let mapLen = initial & 0x1f;
  if (mapLen === 24) mapLen = coseData[pos++];

  for (let i = 0; i < mapLen; i++) {
    // Read key
    const keyByte = coseData[pos++];
    const keyMajor = (keyByte >> 5) & 0x07;
    let keyVal = keyByte & 0x1f;
    if (keyVal === 24) keyVal = coseData[pos++];
    if (keyMajor === 1) keyVal = -1 - keyVal;

    // Read value
    const valByte = coseData[pos];
    const valMajor = (valByte >> 5) & 0x07;

    if (valMajor === 2) {
      // Byte string
      pos++;
      let bLen = valByte & 0x1f;
      if (bLen === 24) bLen = coseData[pos++];
      const bData = coseData.slice(pos, pos + bLen);
      pos += bLen;

      if (keyVal === -2) x = bData;
      if (keyVal === -3) y = bData;
    } else if (valMajor === 0) {
      pos++;
      let vv = valByte & 0x1f;
      if (vv === 24) { pos++; }
      else if (vv === 25) { pos += 2; }
    } else if (valMajor === 1) {
      pos++;
      let vv = valByte & 0x1f;
      if (vv === 24) { pos++; }
      else if (vv === 25) { pos += 2; }
    } else {
      pos++;
    }
  }

  if (!x || !y || x.length !== 32 || y.length !== 32) {
    throw new Error("Failed to extract P-256 coordinates from COSE key");
  }

  const uncompressed = new Uint8Array(65);
  uncompressed[0] = 0x04;
  uncompressed.set(x, 1);
  uncompressed.set(y, 33);

  return {
    credentialId,
    compressedPubKey: compressP256(uncompressed),
    aaguid,
    signCount,
  };
}

// Minimal CBOR decoder for attestation object
function decodeAttestationObject(data: Uint8Array): { authData: Uint8Array } {
  // The attestation object is a CBOR map with keys like "fmt", "attStmt", "authData"
  // We need to find "authData" which is a byte string
  let pos = 0;
  const initial = data[pos++];
  let mapLen = initial & 0x1f;
  if (mapLen === 24) mapLen = data[pos++];

  for (let i = 0; i < mapLen; i++) {
    // Read text key
    const keyByte = data[pos++];
    const keyMajor = (keyByte >> 5) & 0x07;
    let keyLen = keyByte & 0x1f;
    if (keyLen === 24) keyLen = data[pos++];

    let keyStr = "";
    if (keyMajor === 3) {
      keyStr = new TextDecoder().decode(data.slice(pos, pos + keyLen));
      pos += keyLen;
    }

    // Read value
    const valByte = data[pos];
    const valMajor = (valByte >> 5) & 0x07;

    if (keyStr === "authData" && valMajor === 2) {
      pos++;
      let vLen = valByte & 0x1f;
      if (vLen === 24) { vLen = data[pos++]; }
      else if (vLen === 25) { vLen = (data[pos] << 8) | data[pos + 1]; pos += 2; }
      else if (vLen === 26) {
        vLen = (data[pos] << 24) | (data[pos + 1] << 16) | (data[pos + 2] << 8) | data[pos + 3];
        pos += 4;
      }
      return { authData: data.slice(pos, pos + vLen) };
    } else {
      // Skip value
      pos = skipCborValue(data, pos);
    }
  }

  throw new Error("authData not found in attestation object");
}

function skipCborValue(data: Uint8Array, pos: number): number {
  const b = data[pos++];
  const major = (b >> 5) & 0x07;
  let info = b & 0x1f;

  if (info === 24) info = data[pos++];
  else if (info === 25) { info = (data[pos] << 8) | data[pos + 1]; pos += 2; }
  else if (info === 26) { info = (data[pos] << 24) | (data[pos + 1] << 16) | (data[pos + 2] << 8) | data[pos + 3]; pos += 4; }

  if (major === 0 || major === 1) return pos; // integer
  if (major === 2 || major === 3) return pos + info; // byte/text string
  if (major === 4) { // array
    for (let i = 0; i < info; i++) pos = skipCborValue(data, pos);
    return pos;
  }
  if (major === 5) { // map
    for (let i = 0; i < info; i++) {
      pos = skipCborValue(data, pos); // key
      pos = skipCborValue(data, pos); // value
    }
    return pos;
  }
  if (major === 7) return pos; // simple/float
  return pos;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      bindSessionId, userId, origin, rpId,
      credential, bindingLevel, walletAddress,
      walletProofHashes,
    } = await req.json();

    if (!bindSessionId || !userId || !origin || !rpId || !credential || !walletAddress) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
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

    // 1) Parse clientDataJSON
    const clientDataJSON = JSON.parse(
      new TextDecoder().decode(b64urlDecode(credential.response.clientDataJSON))
    );

    // Verify type
    if (clientDataJSON.type !== "webauthn.create") {
      return new Response(
        JSON.stringify({ error: "Invalid clientDataJSON type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify origin
    if (clientDataJSON.origin !== origin) {
      await supabase.rpc("passkey_audit", {
        p_event_type: "register_origin_mismatch",
        p_success: false,
        p_user_id: userId,
        p_iota_wallet_address: walletAddress,
        p_bind_session_id: bindSessionId,
        p_metadata: { expected: origin, received: clientDataJSON.origin },
      });
      return new Response(
        JSON.stringify({ error: "Origin mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2) Consume challenge atomically
    const challengeBytes = b64urlDecode(clientDataJSON.challenge);
    const challengeHash = await sha256(challengeBytes);

    const { error: consumeError } = await supabase.rpc("passkey_consume_challenge", {
      p_challenge_hash: `\\x${hexFromBytes(challengeHash)}`,
      p_challenge_type: "webauthn_register",
      p_bind_session_id: bindSessionId,
      p_expected_origin: origin,
      p_expected_rp_id: rpId,
    });

    if (consumeError) {
      return new Response(
        JSON.stringify({ error: "Challenge invalid, expired, or already used" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3) Parse attestation object to get authData
    const attestationObjectBytes = b64urlDecode(credential.response.attestationObject);
    const { authData } = decodeAttestationObject(attestationObjectBytes);

    // Verify rpIdHash
    const expectedRpIdHash = await sha256(new TextEncoder().encode(rpId));
    const rpIdHash = authData.subarray(0, 32);
    if (hexFromBytes(rpIdHash) !== hexFromBytes(expectedRpIdHash)) {
      await supabase.rpc("passkey_audit", {
        p_event_type: "register_rpid_mismatch",
        p_success: false,
        p_user_id: userId,
        p_bind_session_id: bindSessionId,
        p_metadata: { expected: hexFromBytes(expectedRpIdHash), received: hexFromBytes(rpIdHash) },
      });
      return new Response(
        JSON.stringify({ error: "RP ID hash mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify UP and UV flags
    const flags = authData[32];
    const upFlag = (flags & 0x01) !== 0;
    const uvFlag = (flags & 0x04) !== 0;

    if (!upFlag) {
      return new Response(
        JSON.stringify({ error: "User presence not verified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!uvFlag) {
      return new Response(
        JSON.stringify({ error: "User verification not performed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4) Extract public key
    let compressedPubKey: Uint8Array;
    let credentialId: Uint8Array;
    let aaguid = "00000000-0000-0000-0000-000000000000";
    let signCount = 0;

    // Try getPublicKey() result first (SPKI DER)
    if (credential.response.publicKey) {
      compressedPubKey = parseSpkiToCompressed(credential.response.publicKey);
      credentialId = b64urlDecode(credential.rawId);
      // Still parse authData for aaguid and signCount
      try {
        const parsed = parseCoseKeyFromAuthData(authData);
        aaguid = parsed.aaguid;
        signCount = parsed.signCount;
      } catch {}
    } else {
      // Fallback: parse from attestation authData COSE key
      const parsed = parseCoseKeyFromAuthData(authData);
      compressedPubKey = parsed.compressedPubKey;
      credentialId = parsed.credentialId;
      aaguid = parsed.aaguid;
      signCount = parsed.signCount;
    }

    // 5) Insert binding
    const { data: bindingId, error: bindError } = await supabase.rpc("passkey_insert_binding", {
      p_user_id: userId,
      p_iota_wallet_address: walletAddress,
      p_credential_id: `\\x${hexFromBytes(credentialId)}`,
      p_public_key: `\\x${hexFromBytes(compressedPubKey)}`,
      p_sign_count: signCount,
      p_binding_level: bindingLevel || "passkey_wallet",
      p_origin: origin,
      p_rp_id: rpId,
      p_wallet_proof_hashes: walletProofHashes || {},
      p_aaguid: aaguid !== "00000000-0000-0000-0000-000000000000" ? aaguid : null,
      p_transports: credential.response.transports || ["internal"],
    });

    if (bindError) {
      console.error("Insert binding error:", bindError);
      return new Response(
        JSON.stringify({ error: "Failed to store passkey binding" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        bindingId,
        walletAddress,
        bindingLevel: bindingLevel || "passkey_wallet",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("passkey-register-verify error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
