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
    const { wallet_address, domain_name } = await req.json();
    if (!wallet_address) {
      return new Response(
        JSON.stringify({ error: "Missing wallet_address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find identity — try domain_name first, then fall back to wallet_address
    let identity: { id: string } | null = null;

    if (domain_name) {
      const { data } = await supabase
        .from("messaging_identities")
        .select("id")
        .eq("domain_name", domain_name.toLowerCase())
        .single();
      identity = data;
    }

    // Fallback: look up by wallet_address (may return multiple identities)
    if (!identity) {
      const { data } = await supabase
        .from("messaging_identities")
        .select("id")
        .eq("wallet_address", wallet_address.toLowerCase())
        .limit(1)
        .maybeSingle();
      identity = data;
    }

    if (!identity) {
      return new Response(
        JSON.stringify({ conversations: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get conversation IDs where this identity is a member
    const { data: memberships } = await supabase
      .from("messaging_members")
      .select("conversation_id")
      .eq("identity_id", identity.id)
      .is("left_at", null);

    if (!memberships || memberships.length === 0) {
      return new Response(
        JSON.stringify({ conversations: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const convIds = memberships.map((m) => m.conversation_id);

    // Fetch conversations with members
    const { data: convos } = await supabase
      .from("messaging_conversations")
      .select("*")
      .in("conversation_id", convIds)
      .order("updated_at", { ascending: false });

    // Fetch all members for these conversations
    const { data: allMembers } = await supabase
      .from("messaging_members")
      .select("conversation_id, identity_id")
      .in("conversation_id", convIds)
      .is("left_at", null);

    // Fetch identity details
    const identityIds = [...new Set((allMembers || []).map((m) => m.identity_id))];
    const { data: identities } = await supabase
      .from("messaging_identities")
      .select("id, domain_name, display_name, avatar_url")
      .in("id", identityIds);

    const identityMap = new Map(
      (identities || []).map((i) => [i.id, i])
    );

    // Fetch latest message per conversation
    const lastMessages = new Map<string, { sent_at: string; preview: string }>();
    for (const convId of convIds) {
      const { data: msgs } = await supabase
        .from("messaging_messages")
        .select("sent_at, sender_identity_id")
        .eq("conversation_id", convId)
        .order("sent_at", { ascending: false })
        .limit(1);
      if (msgs && msgs.length > 0) {
        const senderIdentity = identityMap.get(msgs[0].sender_identity_id);
        const senderLabel = senderIdentity?.domain_name || "someone";
        lastMessages.set(convId, {
          sent_at: msgs[0].sent_at,
          preview: `${senderLabel} sent a message`,
        });
      }
    }

    const conversations = (convos || []).map((conv) => {
      const members = (allMembers || [])
        .filter((m) => m.conversation_id === conv.conversation_id)
        .map((m) => {
          const id = identityMap.get(m.identity_id);
          return {
            identity_id: m.identity_id,
            domain_name: id?.domain_name || "unknown",
            display_name: id?.display_name || null,
            avatar_url: id?.avatar_url || null,
          };
        });

      const last_message = lastMessages.get(conv.conversation_id) || null;
      return { ...conv, members, last_message };
    });

    return new Response(
      JSON.stringify({ conversations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
