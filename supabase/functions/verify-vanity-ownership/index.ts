/**
 * Edge function: verify-vanity-ownership
 * Checks if a given EVM address owns any .vanity NFT domains on Polygon
 * by querying the Unstoppable Domains contract directly.
 *
 * Contract: 0xa9a6A3626993D487d2Dbda3173cf58cA1a9D9e9f (Polygon)
 * Uses balanceOf + tokenOfOwnerByIndex + tokenURI/registry to resolve names.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const UD_CONTRACT = "0xa9a6A3626993D487d2Dbda3173cf58cA1a9D9e9f";
const POLYGON_RPC = "https://polygon-rpc.com";

// Minimal ABI function selectors
const BALANCE_OF = "0x70a08231"; // balanceOf(address)
const TOKEN_OF_OWNER_BY_INDEX = "0x2f745c59"; // tokenOfOwnerByIndex(address,uint256)
const REGISTRY_OF = "0x4decdde6"; // reverseNameOf(uint256) — actually we use UD Resolution API as fallback

function padAddress(addr: string): string {
  return "0x" + addr.replace("0x", "").toLowerCase().padStart(64, "0");
}

function padUint256(n: number): string {
  return "0x" + n.toString(16).padStart(64, "0");
}

async function ethCall(to: string, data: string): Promise<string> {
  const res = await fetch(POLYGON_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
  return json.result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress } = await req.json();

    if (!walletAddress || typeof walletAddress !== "string") {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing walletAddress" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const addr = walletAddress.toLowerCase();
    console.log(`[verify-vanity] Checking .vanity NFTs for ${addr} on Polygon`);

    // Step 1: Get balanceOf from the UD contract on Polygon
    const balanceData = BALANCE_OF + padAddress(addr).slice(2);
    const balanceHex = await ethCall(UD_CONTRACT, balanceData);
    const balance = parseInt(balanceHex, 16);
    console.log(`[verify-vanity] Balance: ${balance}`);

    if (balance === 0 || isNaN(balance)) {
      return new Response(
        JSON.stringify({ ok: true, domains: [], count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Get token IDs using tokenOfOwnerByIndex
    const maxTokens = Math.min(balance, 50); // Cap at 50
    const tokenIds: bigint[] = [];
    for (let i = 0; i < maxTokens; i++) {
      try {
        const data = TOKEN_OF_OWNER_BY_INDEX + padAddress(addr).slice(2) + padUint256(i).slice(2);
        const result = await ethCall(UD_CONTRACT, data);
        tokenIds.push(BigInt(result));
      } catch (e) {
        console.warn(`[verify-vanity] tokenOfOwnerByIndex(${i}) failed:`, e);
        break;
      }
    }

    console.log(`[verify-vanity] Found ${tokenIds.length} token IDs`);

    // Step 3: Use UD Resolution API to resolve token IDs to domain names
    // (more reliable than decoding on-chain metadata)
    const apiKey = Deno.env.get("UD_API_KEY");
    const vanityDomains: string[] = [];

    // Primary: Try reverse resolution + owner endpoints via UD API
    if (apiKey) {
      // Method A: Reverse resolution
      try {
        const reverseUrl = `https://api.unstoppabledomains.com/resolve/reverse/${encodeURIComponent(addr)}`;
        const reverseRes = await fetch(reverseUrl, {
          headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        });
        if (reverseRes.ok) {
          const reverseData = await reverseRes.json();
          const domain = reverseData?.meta?.domain || reverseData?.domain || "";
          if (typeof domain === "string" && domain.endsWith(".vanity")) {
            vanityDomains.push(domain);
          }
        }
      } catch (e) {
        console.warn("[verify-vanity] Reverse resolution failed:", e);
      }

      // Method B: Owner domains endpoint
      try {
        const ownerUrl = `https://api.unstoppabledomains.com/resolve/owners/${encodeURIComponent(addr)}/domains`;
        const ownerRes = await fetch(ownerUrl, {
          headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        });
        if (ownerRes.ok) {
          const ownerData = await ownerRes.json();
          const items = Array.isArray(ownerData?.data) ? ownerData.data : Array.isArray(ownerData) ? ownerData : [];
          for (const item of items) {
            const name = item?.attributes?.meta?.domain || item?.meta?.domain || item?.id || item?.name || item?.domain || "";
            if (typeof name === "string" && name.endsWith(".vanity") && !vanityDomains.includes(name)) {
              vanityDomains.push(name);
            }
          }
        }
      } catch (e) {
        console.warn("[verify-vanity] Owner endpoint failed:", e);
      }
    }

    // If API didn't find names but we have on-chain balance, report the balance
    // so the UI knows ownership exists even without resolved names
    if (vanityDomains.length === 0 && tokenIds.length > 0) {
      // Try profile API as last resort
      try {
        const profileUrl = `https://api.unstoppabledomains.com/profile/public/${encodeURIComponent(addr)}`;
        const profileRes = await fetch(profileUrl, { headers: { Accept: "application/json" } });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          const domain = profileData?.meta?.domain || "";
          if (typeof domain === "string" && domain.endsWith(".vanity")) {
            vanityDomains.push(domain);
          }
        }
      } catch (e) {
        console.warn("[verify-vanity] Profile fallback failed:", e);
      }
    }

    console.log(`[verify-vanity] Found ${vanityDomains.length} .vanity domains:`, vanityDomains);

    return new Response(
      JSON.stringify({
        ok: true,
        domains: vanityDomains,
        count: vanityDomains.length,
        onChainBalance: tokenIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[verify-vanity] Error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
