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
    const { conversation_id, device_id, wallet_address } = await req.json();

    if (!conversation_id || !device_id || !wallet_address) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the device belongs to the requester
    const { data: device } = await supabase
      .from("messaging_devices")
      .select("device_id, identity_id")
      .eq("device_id", device_id)
      .is("revoked_at", null)
      .maybeSingle();

    if (!device) {
      return new Response(
        JSON.stringify({ error: "Device not found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify membership
    const { data: membership } = await supabase
      .from("messaging_members")
      .select("identity_id")
      .eq("conversation_id", conversation_id)
      .eq("identity_id", device.identity_id)
      .is("left_at", null)
      .maybeSingle();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: "Not a member" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch messages
    const { data: msgs } = await supabase
      .from("messaging_messages")
      .select("*")
      .eq("conversation_id", conversation_id)
      .order("sent_at", { ascending: true })
      .limit(100);

    if (!msgs || msgs.length === 0) {
      return new Response(
        JSON.stringify({ messages: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messageIds = msgs.map((m) => m.message_id);

    // Fetch envelopes for this device
    const { data: envelopes } = await supabase
      .from("messaging_envelopes")
      .select("message_id, wrapped_msg_key")
      .in("message_id", messageIds)
      .eq("recipient_device_id", device_id);

    const envelopeMap = new Map(
      (envelopes || []).map((e) => [e.message_id, e.wrapped_msg_key])
    );

    // Fetch sender identities
    const senderIds = [...new Set(msgs.map((m) => m.sender_identity_id))];
    const { data: senders } = await supabase
      .from("messaging_identities")
      .select("id, domain_name, avatar_url")
      .in("id", senderIds);

    const senderMap = new Map(
      (senders || []).map((s) => [s.id, s])
    );

    // Check notarization
    const { data: proofs } = await supabase
      .from("messaging_notarization_proofs")
      .select("message_id")
      .in("message_id", messageIds);

    const notarizedSet = new Set(
      (proofs || []).map((p) => p.message_id)
    );

    const messages = msgs.map((msg) => {
      const sender = senderMap.get(msg.sender_identity_id);
      return {
        message_id: msg.message_id,
        sender_domain: sender?.domain_name || "unknown",
        sender_avatar: sender?.avatar_url || null,
        sent_at: msg.sent_at,
        ciphertext: msg.ciphertext,
        nonce: msg.nonce,
        ad: msg.ad,
        cipher_suite: msg.cipher_suite,
        wrapped_msg_key: envelopeMap.get(msg.message_id) || null,
        notarized: notarizedSet.has(msg.message_id),
      };
    });

    return new Response(
      JSON.stringify({ messages }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
