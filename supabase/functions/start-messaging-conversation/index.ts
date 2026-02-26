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

    // Find sender identity and verify wallet matches
    const { data: sender } = await supabase
      .from("messaging_identities")
      .select("id, wallet_address")
      .eq("domain_name", sender_domain.toLowerCase())
      .single();

    if (!sender) {
      return new Response(
        JSON.stringify({ error: "Sender not registered" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Server-side check: verify wallet matches registered identity
    if (sender.wallet_address.toLowerCase() !== sender_wallet.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "Wallet address does not match registered identity" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Check if ANY direct conversation already exists between these two identities
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
    // Find ALL overlapping conversation IDs (not just the first)
    const sharedConvIds = (recipientConvos || [])
      .filter((m) => senderConvIds.has(m.conversation_id))
      .map((m) => m.conversation_id);

    // Check each shared conversation to see if any is a direct chat
    if (sharedConvIds.length > 0) {
      const { data: sharedConvs } = await supabase
        .from("messaging_conversations")
        .select("conversation_id, conversation_type")
        .in("conversation_id", sharedConvIds);

      const existingDirect = (sharedConvs || []).find(
        (c) => c.conversation_type === "direct"
      );

      if (existingDirect) {
        return new Response(
          JSON.stringify({ conversation_id: existingDirect.conversation_id }),
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
