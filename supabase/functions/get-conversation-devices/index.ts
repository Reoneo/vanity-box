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
    const { conversation_id, wallet_address } = await req.json();

    if (!conversation_id || !wallet_address) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all member identity IDs
    const { data: members } = await supabase
      .from("messaging_members")
      .select("identity_id")
      .eq("conversation_id", conversation_id)
      .is("left_at", null);

    if (!members || members.length === 0) {
      return new Response(
        JSON.stringify({ devices: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const identityIds = members.map((m) => m.identity_id);

    // Get all active devices for these identities
    const { data: devices } = await supabase
      .from("messaging_devices")
      .select("device_id, device_pubkey, identity_id")
      .in("identity_id", identityIds)
      .is("revoked_at", null);

    return new Response(
      JSON.stringify({ devices: devices || [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
