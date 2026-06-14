// Edge function: save (or update) the Bluesky DID for a .vanity domain.
// Server-side validates:
//  - EVM signature recovers to the claimed eth address
//  - Signed message timestamp within 5 minutes
//  - The eth address owns the .vanity domain (via verify-vanity-ownership)
//  - The eth address is linked to the claimed iota address (iota_wallet_links)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { verifyMessage } from "https://esm.sh/viem@2.21.45";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DID_REGEX = /^did:(plc|web|key):[A-Za-z0-9._:%-]{4,256}$/;
const VANITY_REGEX = /^[a-z0-9-]{1,63}\.vanity$/;
const FIVE_MIN_MS = 5 * 60 * 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const vanityName = String(body?.vanityName || "").trim().toLowerCase();
    const did = String(body?.did || "").trim();
    const ethAddress = String(body?.ethAddress || "").trim().toLowerCase();
    const iotaAddress = String(body?.iotaAddress || "").trim().toLowerCase();
    const signature = String(body?.signature || "").trim();
    const timestamp = Number(body?.timestamp);

    if (!VANITY_REGEX.test(vanityName)) {
      return json({ ok: false, error: "invalid_vanity_name" }, 400);
    }
    if (!DID_REGEX.test(did)) {
      return json({ ok: false, error: "invalid_did" }, 400);
    }
    if (!/^0x[a-f0-9]{40}$/.test(ethAddress)) {
      return json({ ok: false, error: "invalid_eth_address" }, 400);
    }
    if (!iotaAddress.startsWith("0x") || iotaAddress.length < 10) {
      return json({ ok: false, error: "invalid_iota_address" }, 400);
    }
    if (!signature.startsWith("0x")) {
      return json({ ok: false, error: "invalid_signature" }, 400);
    }
    if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > FIVE_MIN_MS) {
      return json({ ok: false, error: "expired_signature" }, 400);
    }

    const subdomain = vanityName.replace(/\.vanity$/, "");

    // Reconstruct the signed message (must match client exactly).
    const message = [
      "Bind Bluesky handle",
      `vanity: ${vanityName}`,
      `did: ${did}`,
      `iota: ${iotaAddress}`,
      `eth: ${ethAddress}`,
      `ts: ${timestamp}`,
    ].join("\n");

    let valid = false;
    try {
      valid = await verifyMessage({
        address: ethAddress as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });
    } catch (e) {
      console.error("[save-bluesky-did] verifyMessage error", e);
    }
    if (!valid) {
      return json({ ok: false, error: "bad_signature" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify cross-chain link: iota_wallet_links must have a row binding
    // the iota name's owner address to this eth address.
    const { data: link, error: linkErr } = await supabase
      .from("iota_wallet_links")
      .select("evm_address, iota_address")
      .eq("evm_address", ethAddress)
      .maybeSingle();

    if (linkErr) {
      console.error("[save-bluesky-did] link query error", linkErr);
      return json({ ok: false, error: "link_lookup_failed" }, 500);
    }
    if (!link) {
      return json({ ok: false, error: "wallet_not_linked" }, 403);
    }

    // Verify .vanity ownership via the existing edge function.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const verifyRes = await fetch(`${supabaseUrl}/functions/v1/verify-vanity-ownership`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ walletAddress: ethAddress }),
    });
    const verifyData = await verifyRes.json().catch(() => null);
    const ownedDomains: string[] = Array.isArray(verifyData?.domains)
      ? verifyData.domains.map((d: string) => String(d).toLowerCase())
      : [];

    if (!ownedDomains.includes(vanityName)) {
      return json({
        ok: false,
        error: "not_owner",
        owned: ownedDomains,
      }, 403);
    }

    // Upsert
    const { error: upsertErr } = await supabase
      .from("vanity_bluesky_handles")
      .upsert({
        vanity_name: vanityName,
        subdomain,
        did,
        owner_eth_address: ethAddress,
        owner_iota_address: iotaAddress,
      }, { onConflict: "vanity_name" });

    if (upsertErr) {
      console.error("[save-bluesky-did] upsert error", upsertErr);
      return json({ ok: false, error: "save_failed" }, 500);
    }

    return json({
      ok: true,
      handle: `${subdomain}.vanity.box`,
      did,
    });
  } catch (err: any) {
    console.error("[save-bluesky-did] error", err);
    return json({ ok: false, error: String(err?.message || err) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
