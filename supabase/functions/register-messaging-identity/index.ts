import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const { wallet_address, domain_name, domain_type, device_pubkey } =
      await req.json();

    if (!wallet_address || !domain_name || !device_pubkey) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      // Update last seen
      await supabase
        .from("messaging_devices")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("device_id", deviceId);
    } else {
      // Create new device
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
