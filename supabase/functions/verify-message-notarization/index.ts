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
    const { message_id } = await req.json();

    if (!message_id) {
      return new Response(
        JSON.stringify({ error: "Missing message_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch proof
    const { data: proof } = await supabase
      .from("messaging_notarization_proofs")
      .select("*")
      .eq("message_id", message_id)
      .maybeSingle();

    if (!proof) {
      return new Response(
        JSON.stringify({ verified: false, reason: "No notarization proof found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch batch
    const { data: batch } = await supabase
      .from("messaging_notarization_batches")
      .select("*")
      .eq("batch_id", proof.batch_id)
      .single();

    if (!batch || batch.status !== "anchored") {
      return new Response(
        JSON.stringify({
          verified: false,
          reason: "Batch not anchored",
          batch_status: batch?.status,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return proof data for client-side verification
    return new Response(
      JSON.stringify({
        verified: true,
        leaf_hash: proof.leaf_hash,
        leaf_index: proof.leaf_index,
        proof: proof.proof,
        root_hash: batch.root_hash,
        iota_notarization_id: batch.iota_notarization_id,
        iota_tx_digest: batch.iota_tx_digest,
        anchored_at: batch.created_at,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
