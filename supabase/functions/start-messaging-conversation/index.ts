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
    const { sender_wallet, sender_domain, recipient_domain } = await req.json();

    if (!sender_wallet || !sender_domain || !recipient_domain) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find sender identity
    const { data: sender } = await supabase
      .from("messaging_identities")
      .select("id")
      .eq("domain_name", sender_domain.toLowerCase())
      .single();

    if (!sender) {
      return new Response(
        JSON.stringify({ error: "Sender not registered" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find or auto-create recipient identity
    let recipientId: string;
    const { data: recipient } = await supabase
      .from("messaging_identities")
      .select("id")
      .eq("domain_name", recipient_domain.toLowerCase())
      .maybeSingle();

    if (recipient) {
      recipientId = recipient.id;
    } else {
      // Auto-create a placeholder identity for the recipient
      const { data: newRecipient, error: recErr } = await supabase
        .from("messaging_identities")
        .insert({
          wallet_address: "pending",
          domain_name: recipient_domain.toLowerCase(),
          domain_type: recipient_domain.endsWith(".iota") ? "iota" : 
                       recipient_domain.endsWith(".eth") ? "eth" :
                       recipient_domain.endsWith(".box") ? "box" : "other",
        })
        .select("id")
        .single();
      if (recErr) throw recErr;
      recipientId = newRecipient.id;
    }

    // Check if a direct conversation already exists between these two
    const { data: senderConvos } = await supabase
      .from("messaging_members")
      .select("conversation_id")
      .eq("identity_id", sender.id)
      .is("left_at", null);

    const { data: recipientConvos } = await supabase
      .from("messaging_members")
      .select("conversation_id")
      .eq("identity_id", recipientId)
      .is("left_at", null);

    const senderConvIds = new Set(
      (senderConvos || []).map((m) => m.conversation_id)
    );
    const existingConvId = (recipientConvos || []).find((m) =>
      senderConvIds.has(m.conversation_id)
    )?.conversation_id;

    if (existingConvId) {
      // Verify it's a direct conversation
      const { data: conv } = await supabase
        .from("messaging_conversations")
        .select("conversation_type")
        .eq("conversation_id", existingConvId)
        .single();

      if (conv?.conversation_type === "direct") {
        return new Response(
          JSON.stringify({ conversation_id: existingConvId }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Create new conversation
    const { data: conv, error: convErr } = await supabase
      .from("messaging_conversations")
      .insert({
        conversation_type: "direct",
        created_by: sender.id,
      })
      .select("conversation_id")
      .single();

    if (convErr) throw convErr;

    // Add both members
    await supabase.from("messaging_members").insert([
      { conversation_id: conv.conversation_id, identity_id: sender.id, role: "admin" },
      { conversation_id: conv.conversation_id, identity_id: recipientId, role: "member" },
    ]);

    return new Response(
      JSON.stringify({ conversation_id: conv.conversation_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
