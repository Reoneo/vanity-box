import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Basenames (.base.eth) are ENS subnames whose records may live on Base and
// are resolved via CCIP-read (EIP-3668). Web3.bio doesn't always index these.
// When Web3.bio returns 404 for a .base.eth name, we fall back to onchain
// resolution using viem (with CCIP read enabled).
//
// NOTE: This keeps the return shape compatible with existing UI code by
// returning an array of 1 "web3.bio-like" profile object.
import { createPublicClient, http, getEnsAddress, getEnsAvatar, getEnsText } from "https://esm.sh/viem@2.23.2";
import { mainnet } from "https://esm.sh/viem@2.23.2/chains";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isBasename(handle: string): boolean {
  return handle.trim().toLowerCase().endsWith(".base.eth");
}

function ipfsToGateway(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("ipfs://")) {
    return url.replace("ipfs://", "https://ipfs.io/ipfs/");
  }
  if (url.startsWith("ipns://")) {
    return url.replace("ipns://", "https://ipfs.io/ipns/");
  }
  return url;
}

async function resolveBasenameOnchain(name: string) {
  // Prefer env-configured RPC, but keep a short fallback list.
  const rpcCandidates = [
    Deno.env.get("ETH_RPC_URL") || "",
    "https://cloudflare-eth.com",
    "https://rpc.ankr.com/eth",
  ].filter(Boolean);

  let lastErr: any = null;

  for (const rpcUrl of rpcCandidates) {
    try {
      const client = createPublicClient({
        chain: mainnet,
        transport: http(rpcUrl),
        // Critical: enable CCIP read so L2-backed resolvers (Basenames) work.
        ccipRead: true,
      });

      const address = await getEnsAddress(client, { name });
      if (!address) return null;

      // Optional extras — swallow errors, because some names won't have these.
      let avatar: string | null = null;
      let description: string | null = null;
      let url: string | null = null;
      let email: string | null = null;

      try {
        avatar = await getEnsAvatar(client, { name });
      } catch (_) {
        avatar = null;
      }

      try {
        description = await getEnsText(client, { name, key: "description" });
      } catch (_) {
        description = null;
      }

      try {
        url = await getEnsText(client, { name, key: "url" });
      } catch (_) {
        url = null;
      }

      try {
        email = await getEnsText(client, { name, key: "email" });
      } catch (_) {
        email = null;
      }

      return {
        address,
        identity: name,
        platform: "basenames",
        displayName: name,
        avatar: ipfsToGateway(avatar),
        description,
        email,
        header: null,
        location: null,
        links: url
          ? {
              website: { link: url, handle: url, sources: ["ens"] },
            }
          : {},
        social: { follower: null, following: null },
      };
    } catch (err: any) {
      lastErr = err;
      console.warn("⚠️ Basename onchain resolve failed for RPC", rpcUrl, "-", err?.message || err);
      continue;
    }
  }

  console.error("❌ Basename onchain resolve failed for all RPCs:", lastErr?.message || lastErr);
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { handle } = await req.json();

    console.log("🔍 Web3.bio lookup request for handle:", handle);

    if (!handle) {
      throw new Error("Handle is required");
    }

    const WEB3BIO_API_KEY = Deno.env.get("WEB3BIO_API_KEY");

    if (!WEB3BIO_API_KEY) {
      console.error("❌ WEB3BIO_API_KEY not configured");
      throw new Error("WEB3BIO_API_KEY not configured");
    }

    // Retry logic with exponential backoff
    const maxRetries = 3;
    const retryDelays = [1000, 2000, 4000]; // 1s, 2s, 4s
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 Retry attempt ${attempt + 1}/${maxRetries} after ${retryDelays[attempt - 1]}ms`);
          await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt - 1]));
        }

        // Call web3.bio API with timeout
        const apiUrl = `https://api.web3.bio/profile/${handle}`;
        console.log(`📡 Calling Web3.bio API (attempt ${attempt + 1}):`, apiUrl);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const response = await fetch(apiUrl, {
          headers: {
            "X-API-KEY": `Bearer ${WEB3BIO_API_KEY}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log("📥 Web3.bio response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ Web3.bio API error:", response.status, errorText);

          // If 404 (not found), don't retry.
          // Special-case Basenames: Web3.bio may not index .base.eth yet, but the
          // name can still resolve onchain via ENS CCIP-read.
          if (response.status === 404) {
            if (isBasename(handle)) {
              console.log("🔄 Web3.bio 404 for .base.eth — trying onchain ENS CCIP-read fallback");
              const onchain = await resolveBasenameOnchain(handle.trim().toLowerCase());
              if (onchain) {
                // Keep compatibility with the UI that expects Web3.bio-style arrays
                return new Response(JSON.stringify([onchain]), {
                  status: 200,
                  headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                  },
                });
              }
            }

            return new Response(
              JSON.stringify({
                data: null,
                notFound: true,
                message: "Profile not found",
              }),
              {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }

          // If 500 error, retry
          if (response.status >= 500 && attempt < maxRetries - 1) {
            lastError = new Error(`Web3.bio API error: ${response.status}`);
            continue;
          }

          throw new Error(`Web3.bio API error: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("✅ Web3.bio profile data received:", JSON.stringify(data).substring(0, 200));

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (fetchError: any) {
        lastError = fetchError;

        // If it's an abort error or network error, retry
        if ((fetchError.name === "AbortError" || fetchError.message.includes("fetch")) && attempt < maxRetries - 1) {
          console.warn(`⚠️ Attempt ${attempt + 1} failed:`, fetchError.message);
          continue;
        }

        // If last attempt or non-retryable error, throw
        if (attempt === maxRetries - 1) {
          throw lastError;
        }
      }
    }

    throw lastError || new Error("All retry attempts failed");
  } catch (error: any) {
    console.error("❌ Error fetching web3.bio profile:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
