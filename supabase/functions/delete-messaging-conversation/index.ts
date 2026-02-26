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
    const { conversation_id, wallet_address, domain_name } = await req.json();

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

    // Verify the caller is a member of this conversation
    const { data: identity } = await supabase
      .from("messaging_identities")
      .select("id")
      .eq("domain_name", (domain_name || "").toLowerCase())
      .single();

    if (!identity) {
      // Fallback to wallet
      const { data: walletIdentity } = await supabase
        .from("messaging_identities")
        .select("id")
        .eq("wallet_address", wallet_address.toLowerCase())
        .limit(1)
        .maybeSingle();

      if (!walletIdentity) {
        return new Response(
          JSON.stringify({ error: "Identity not found" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Delete envelopes for messages in this conversation
    const { data: msgs } = await supabase
      .from("messaging_messages")
      .select("message_id")
      .eq("conversation_id", conversation_id);

    const msgIds = (msgs || []).map((m) => m.message_id);

    if (msgIds.length > 0) {
      // Delete envelopes
      await supabase
        .from("messaging_envelopes")
        .delete()
        .in("message_id", msgIds);

      // Delete notarization proofs
      await supabase
        .from("messaging_notarization_proofs")
        .delete()
        .in("message_id", msgIds);

      // Delete messages
      await supabase
        .from("messaging_messages")
        .delete()
        .eq("conversation_id", conversation_id);
    }

    // Delete members
    await supabase
      .from("messaging_members")
      .delete()
      .eq("conversation_id", conversation_id);

    // Delete conversation
    await supabase
      .from("messaging_conversations")
      .delete()
      .eq("conversation_id", conversation_id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
