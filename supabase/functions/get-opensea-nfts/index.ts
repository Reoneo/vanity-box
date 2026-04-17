import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type DebugInfo = {
  walletAddressUsed?: string;
  isEvmAddress?: boolean;
  attemptedChains?: string[];
  fetchedChains?: string[];
  totalFetchedBeforeDedupe?: number;
  totalAfterDedupe?: number;
  sampleKeys?: Array<{
    chain?: string;
    contract?: any;
    identifier?: any;
    key?: string;
  }>;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const debug: DebugInfo = {};

  try {
    let body: any;
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error("Failed to parse request body:", e);
      body = {};
    }

    const { walletAddress: rawWalletAddress } = body;

    // Sanitize walletAddress - handle MiniKit's undefined object format
    const walletAddress =
      rawWalletAddress && typeof rawWalletAddress === "object" && (rawWalletAddress as any)?._type === "undefined"
        ? undefined
        : typeof rawWalletAddress === "string" && rawWalletAddress !== "undefined" && rawWalletAddress.trim() !== ""
          ? rawWalletAddress.trim()
          : undefined;

    debug.walletAddressUsed = walletAddress;

    if (!walletAddress) {
      const message = "No wallet address provided to OpenSea function.";
      console.log(message);
      return new Response(
        JSON.stringify({
          nfts: [],
          attempted: false,
          status: "missing_wallet",
          message,
          debug,
          errorsByChain: { all: message },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Enforce EVM address format for OpenSea (prevents ENS / malformed values)
    const isEvmAddress = /^0x[a-fA-F0-9]{40}$/.test(walletAddress);
    debug.isEvmAddress = isEvmAddress;

    if (!isEvmAddress) {
      const message = `Invalid EVM walletAddress for OpenSea: ${walletAddress}`;
      console.log(message);
      return new Response(
        JSON.stringify({
          nfts: [],
          attempted: false,
          status: "invalid_wallet",
          message,
          debug,
          errorsByChain: { all: message },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("🖼️ Fetching ALL OpenSea NFTs for:", walletAddress);

    const OPENSEA_API_KEY = Deno.env.get("OPENSEA_API_KEY");

    if (!OPENSEA_API_KEY) {
      const message = "OPENSEA_API_KEY is not configured in Supabase secrets.";
      console.error("❌", message);
      return new Response(
        JSON.stringify({
          nfts: [],
          attempted: false,
          status: "missing_api_key",
          message,
          debug,
          errorsByChain: { all: message },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // OpenSea supported chains
    const chains = ["ethereum", "polygon", "arbitrum", "optimism", "base", "avalanche", "bsc", "klaytn", "zora"];

    debug.attemptedChains = chains;

    let allNfts: any[] = [];
    const errorsByChain: Record<string, string> = {};
    const fetchedChains: string[] = [];

    const MAX_TOTAL_NFTS = Number.MAX_SAFE_INTEGER; // Effectively uncapped per user request
    const MAX_PAGES_PER_CHAIN = 100; // Allow large collections to fully paginate
    const LIMIT_PER_REQUEST = 200; // OpenSea max
    const INTER_CHAIN_DELAY = 150;

    for (const chain of chains) {
      if (allNfts.length >= MAX_TOTAL_NFTS) {
        console.log(`⚠️ Reached max NFT limit (${MAX_TOTAL_NFTS}), stopping fetch`);
        break;
      }

      let chainCursor: string | null = null;
      let hasMore = true;
      let pageCount = 0;
      let retryCount = 0;
      const MAX_RETRIES = 3;

      while (hasMore && pageCount < MAX_PAGES_PER_CHAIN && allNfts.length < MAX_TOTAL_NFTS) {
        try {
          let url = `https://api.opensea.io/api/v2/chain/${chain}/account/${walletAddress}/nfts?limit=${LIMIT_PER_REQUEST}`;
          if (chainCursor) url += `&next=${encodeURIComponent(chainCursor)}`;

          console.log(`📡 Fetching from OpenSea (${chain}) page ${pageCount + 1}...`);

          const response = await fetch(url, {
            headers: {
              accept: "application/json",
              "x-api-key": OPENSEA_API_KEY,
            },
          });

          if (response.ok) {
            const data = await response.json();
            fetchedChains.push(chain);

            if (Array.isArray(data?.nfts) && data.nfts.length > 0) {
              const nftsWithChain = data.nfts
                .filter((nft: any) => {
                  const isPoapV2 =
                    nft.contract?.toLowerCase() === "0x22c1f6050e56d2876009903609a2cc3fef83b415" ||
                    nft.collection?.toLowerCase().includes("poap");
                  return !isPoapV2;
                })
                .map((nft: any) => {
                  let rarityScore = 0;
                  let rarityRank = null;

                  if (nft.metadata?.attributes && Array.isArray(nft.metadata.attributes)) {
                    const traitCount = nft.metadata.attributes.length;
                    rarityScore = Math.max(0, 100 - traitCount * 5);

                    const uniqueTraits = nft.metadata.attributes.filter(
                      (trait: any) => trait.rarity || trait.trait_count < 10,
                    );
                    rarityScore += uniqueTraits.length * 10;
                  }

                  return {
                    ...nft,
                    chain,
                    rarity_score: rarityScore,
                    rarity_rank: rarityRank,
                    floor_price: nft.collection?.floor_price,
                    total_supply: nft.collection?.total_supply,
                    created_date: nft.created_at,
                  };
                });

              allNfts = [...allNfts, ...nftsWithChain];
              console.log(
                `✅ ${chain} page ${pageCount + 1}: fetched ${nftsWithChain.length} NFTs (total: ${allNfts.length})`,
              );
            }

            if (data?.next) {
              chainCursor = data.next;
              pageCount++;
            } else {
              hasMore = false;
            }

            retryCount = 0;
          } else if (response.status === 429 && retryCount < MAX_RETRIES) {
            retryCount++;
            const retryAfter = response.headers.get("retry-after");
            const waitMs = retryAfter ? Math.min(15000, Number(retryAfter) * 1000) : 1200 * retryCount;

            console.log(`⚠️ ${chain}: Rate limited (429), retry ${retryCount}/${MAX_RETRIES}, waiting ${waitMs}ms...`);
            await sleep(waitMs);
            continue;
          } else {
            const bodyText = await response.text().catch(() => "");
            const snippet = bodyText ? bodyText.slice(0, 500) : "";
            const errorMsg = `HTTP ${response.status}${snippet ? ` - ${snippet}` : ""}`;

            console.log(`⚠️ ${chain}: OpenSea error`, {
              status: response.status,
              snippet,
            });

            errorsByChain[chain] = errorMsg;
            hasMore = false;
          }
        } catch (chainError: any) {
          const errorMsg = chainError?.message || "Unknown error";
          console.log(`⚠️ Error fetching from ${chain}:`, errorMsg);
          errorsByChain[chain] = errorMsg;
          hasMore = false;
        }
      }

      if (chains.indexOf(chain) < chains.length - 1) {
        await sleep(INTER_CHAIN_DELAY);
      }
    }

    debug.fetchedChains = fetchedChains;
    debug.totalFetchedBeforeDedupe = allNfts.length;

    // Sample keys before dedupe (helps spot undefined fields)
    debug.sampleKeys = allNfts.slice(0, 8).map((n: any) => ({
      chain: n.chain,
      contract: n.contract,
      identifier: n.identifier,
      key: `${n.chain}:${n.contract}:${n.identifier}`,
    }));

    // ✅ Safer dedupe: chain + contract + identifier with fallbacks
    const nftMap = new Map<string, any>();
    allNfts.forEach((nft: any, idx: number) => {
      const contract =
        (typeof nft.contract === "string" && nft.contract) ||
        nft.contract_address ||
        nft.asset_contract?.address ||
        nft.token?.address ||
        "unknown_contract";

      const identifier =
        (typeof nft.identifier === "string" && nft.identifier) ||
        nft.token_id ||
        nft.tokenId ||
        nft.token?.tokenId ||
        `unknown_id_${idx}`;

      const chain = nft.chain || "unknown_chain";
      const uniqueKey = `${chain}:${contract}:${identifier}`;

      if (nftMap.has(uniqueKey)) {
        const existing = nftMap.get(uniqueKey);
        existing.quantity = (existing.quantity || 1) + 1;
      } else {
        nftMap.set(uniqueKey, { ...nft, contract, identifier, quantity: 1 });
      }
    });

    const deduplicatedNfts = Array.from(nftMap.values());
    debug.totalAfterDedupe = deduplicatedNfts.length;

    const attempted = true;
    const hasAnyNfts = deduplicatedNfts.length > 0;

    // Return a visible message even when empty
    const status = hasAnyNfts ? "ok" : Object.keys(errorsByChain).length > 0 ? "upstream_error" : "empty";

    const message = hasAnyNfts
      ? `Fetched ${deduplicatedNfts.length} NFTs from OpenSea.`
      : Object.keys(errorsByChain).length > 0
        ? "OpenSea returned errors for one or more chains. See errorsByChain."
        : "OpenSea returned zero NFTs for the given wallet on the checked chains.";

    return new Response(
      JSON.stringify({
        nfts: deduplicatedNfts,
        attempted,
        status,
        message,
        fetchedChains,
        errorsByChain: Object.keys(errorsByChain).length > 0 ? errorsByChain : {},
        debug,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("❌ Error fetching OpenSea NFTs:", error);
    const message = error?.message || "Unknown error";
    return new Response(
      JSON.stringify({
        nfts: [],
        attempted: true,
        status: "exception",
        message,
        errorsByChain: { all: message },
        debug: {},
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
