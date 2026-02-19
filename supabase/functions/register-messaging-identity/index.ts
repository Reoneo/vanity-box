import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { verifyMessage } from 'https://esm.sh/viem@2.37.5';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { wallet_address, domain_name, domain_type, device_pubkey, signature, timestamp } =
      await req.json();

    if (!wallet_address || !domain_name || !device_pubkey) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Signature verification (EVM wallets) ---
    // IOTA wallets use a different signing scheme; skip verification for non-0x addresses
    const isEvmAddress = /^0x[a-fA-F0-9]{40}$/.test(wallet_address);

    if (isEvmAddress) {
      if (!signature || !timestamp) {
        return new Response(
          JSON.stringify({ error: "Wallet signature required for identity registration" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (Date.now() - timestamp > 300_000) {
        return new Response(
          JSON.stringify({ error: "Request expired" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const expectedMessage = [
        'Register messaging identity',
        `Wallet: ${wallet_address}`,
        `Domain: ${domain_name}`,
        `Device: ${device_pubkey}`,
        `Timestamp: ${timestamp}`,
      ].join('\n');

      const isValid = await verifyMessage({
        address: wallet_address as `0x${string}`,
        message: expectedMessage,
        signature: signature as `0x${string}`,
      });

      if (!isValid) {
        return new Response(
          JSON.stringify({ error: "Invalid wallet signature" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    // --- End signature verification ---

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Upsert identity
    const { data: identity, error: idErr } = await supabase
      .from("messaging_identities")
      .upsert(
        {
          wallet_address,
          domain_name: domain_name.toLowerCase(),
          domain_type: domain_type || "other",
        },
        { onConflict: "domain_name" }
      )
      .select()
      .single();

    if (idErr) throw idErr;

    // Check if device already exists with this pubkey
    const { data: existingDevice } = await supabase
      .from("messaging_devices")
      .select("device_id")
      .eq("identity_id", identity.id)
      .eq("device_pubkey", device_pubkey)
      .is("revoked_at", null)
      .maybeSingle();

    let deviceId: string;
    if (existingDevice) {
      deviceId = existingDevice.device_id;
      await supabase
        .from("messaging_devices")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("device_id", deviceId);
    } else {
      const { data: newDevice, error: devErr } = await supabase
        .from("messaging_devices")
        .insert({
          identity_id: identity.id,
          device_pubkey,
          device_label: "default",
        })
        .select("device_id")
        .single();
      if (devErr) throw devErr;
      deviceId = newDevice.device_id;
    }

    return new Response(
      JSON.stringify({ identity, device_id: deviceId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
