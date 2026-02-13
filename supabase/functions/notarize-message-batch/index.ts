/**
 * Notarize Message Batch
 * 
 * Service-role only. Selects un-notarized messages, builds a Merkle tree,
 * and stores the batch + proofs. 
 * 
 * IOTA on-chain notarization is stubbed here — the actual IOTA Notarization
 * WASM bindings require a Node.js or dedicated worker environment.
 * This function builds the Merkle tree and stores proofs; a separate
 * worker can pick up "pending" batches and anchor them on-chain.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Simple SHA-256 helper
async function sha256Hex(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function buildMerkleTree(leaves: string[]) {
  if (leaves.length === 0) throw new Error("No leaves");

  const n = Math.pow(2, Math.ceil(Math.log2(leaves.length)));
  const padded = [...leaves];
  while (padded.length < n) padded.push(padded[padded.length - 1]);

  const layers: string[][] = [padded];
  while (layers[layers.length - 1].length > 1) {
    const prev = layers[layers.length - 1];
    const next: string[] = [];
    for (let i = 0; i < prev.length; i += 2) {
      next.push(await sha256Hex(prev[i] + prev[i + 1]));
    }
    layers.push(next);
  }

  const root = layers[layers.length - 1][0];

  const proofs = leaves.map((_, leafIndex) => {
    const proof: Array<{ hash: string; side: string }> = [];
    let idx = leafIndex;
    for (let layer = 0; layer < layers.length - 1; layer++) {
      const sibIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
      proof.push({
        hash: layers[layer][sibIdx],
        side: idx % 2 === 0 ? "right" : "left",
      });
      idx = Math.floor(idx / 2);
    }
    return proof;
  });

  return { root, proofs };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch un-notarized messages (max 256 per batch)
    const { data: messages } = await supabase
      .from("messaging_messages")
      .select("message_id, ciphertext, sent_at")
      .is("notarization_batch_id", null)
      .order("sent_at", { ascending: true })
      .limit(256);

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ status: "no_messages" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Compute leaf hashes
    const leafData = await Promise.all(
      messages.map(async (msg) => {
        const ciphertextHash = await sha256Hex(msg.ciphertext);
        const sentMs = new Date(msg.sent_at).getTime();
        const leafHash = await sha256Hex(
          `vanitybox-msg-v1|${msg.message_id}|${ciphertextHash}|${sentMs}`
        );
        return { messageId: msg.message_id, leafHash };
      })
    );

    const leafHashes = leafData.map((l) => l.leafHash);
    const { root, proofs } = await buildMerkleTree(leafHashes);

    // Create batch record (status: pending — waiting for on-chain anchoring)
    const { data: batch, error: batchErr } = await supabase
      .from("messaging_notarization_batches")
      .insert({
        root_hash: root,
        leaf_count: leafHashes.length,
        status: "pending",
      })
      .select("batch_id")
      .single();

    if (batchErr) throw batchErr;

    // Insert proofs
    const proofRows = leafData.map((l, i) => ({
      message_id: l.messageId,
      batch_id: batch.batch_id,
      leaf_hash: l.leafHash,
      leaf_index: i,
      proof: proofs[i],
    }));

    await supabase.from("messaging_notarization_proofs").insert(proofRows);

    // Update messages with batch_id
    const messageIds = leafData.map((l) => l.messageId);
    await supabase
      .from("messaging_messages")
      .update({ notarization_batch_id: batch.batch_id })
      .in("message_id", messageIds);

    return new Response(
      JSON.stringify({
        status: "batch_created",
        batch_id: batch.batch_id,
        root_hash: root,
        leaf_count: leafHashes.length,
        note: "Batch is pending. Run IOTA on-chain anchoring worker to finalize.",
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
