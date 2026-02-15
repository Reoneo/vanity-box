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
    const {
      conversation_id,
      sender_wallet,
      sender_domain,
      sender_device_id,
      payload,
      envelopes,
    } = await req.json();

    if (!conversation_id || !sender_wallet || !sender_domain || !sender_device_id || !payload || !envelopes) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(envelopes) || envelopes.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipient envelopes provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Require sender device envelope so sender can decrypt own messages
    const hasSenderEnvelope = envelopes.some((e: any) => e?.recipientDeviceId === sender_device_id);
    if (!hasSenderEnvelope) {
      return new Response(
        JSON.stringify({ error: "Missing envelope for sender device" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify sender is a member
    const { data: sender } = await supabase
      .from("messaging_identities")
      .select("id")
      .eq("domain_name", sender_domain.toLowerCase())
      .single();

    if (!sender) {
      return new Response(
        JSON.stringify({ error: "Sender not found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: membership } = await supabase
      .from("messaging_members")
      .select("identity_id")
      .eq("conversation_id", conversation_id)
      .eq("identity_id", sender.id)
      .is("left_at", null)
      .maybeSingle();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: "Not a member of this conversation" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert message
    const { data: message, error: msgErr } = await supabase
      .from("messaging_messages")
      .insert({
        conversation_id,
        sender_identity_id: sender.id,
        sender_device_id,
        cipher_suite: payload.cipherSuite,
        ciphertext: payload.ciphertextB64,
        nonce: payload.nonceB64,
        ad: payload.adB64,
      })
      .select("message_id")
      .single();

    if (msgErr) throw msgErr;

    // Insert envelopes
    const envelopeRows = envelopes.map((e: any) => ({
      message_id: message.message_id,
      recipient_device_id: e.recipientDeviceId,
      wrapped_msg_key: e.wrappedMsgKeyB64,
    }));

    try {
      const { error: envErr } = await supabase
        .from("messaging_envelopes")
        .insert(envelopeRows);

      if (envErr) throw envErr;
    } catch (envInsertErr) {
      // Cleanup orphaned message to prevent undecryptable rows
      await supabase
        .from("messaging_messages")
        .delete()
        .eq("message_id", message.message_id);
      throw envInsertErr;
    }

    // Update conversation updated_at
    await supabase
      .from("messaging_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("conversation_id", conversation_id);

    return new Response(
      JSON.stringify({ message_id: message.message_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
