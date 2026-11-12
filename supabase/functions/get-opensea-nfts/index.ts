import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

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

    const chains = ["ethereum", "polygon", "arbitrum", "optimism", "base", "avalanche", "bsc", "klaytn", "zora"];
    const parsed = z.object({ limit: z.number().int().min(1).max(200).default(100), next: z.string().max(12000).optional() }).safeParse(body);
    if (!parsed.success) return new Response(JSON.stringify({ error: 'Invalid NFT page request' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    let positions: Record<string, string | null> = Object.fromEntries(chains.map(c => [c, null]));
    if (parsed.data.next) {
      try {
        const cursor = JSON.parse(parsed.data.next);
        if (cursor.wallet !== walletAddress.toLowerCase() || !cursor.positions || Object.keys(cursor.positions).some(c => !chains.includes(c)) || Object.values(cursor.positions).some(v => v !== null && (typeof v !== 'string' || v.length > 2000))) throw new Error('Invalid cursor');
        positions = cursor.positions;
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid NFT cursor' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }
    debug.attemptedChains = Object.keys(positions);
    let allNfts: any[] = [];
    const errorsByChain: Record<string, string> = {};
    const fetchedChains: string[] = [];
    const pending = Object.entries(positions);
    // One page per chain, three requests at a time. Subsequent pages retain every cursor.
    for (let i = 0; i < pending.length; i += 3) {
      await Promise.all(pending.slice(i, i + 3).map(async ([chain, cursor]) => {
        const url = new URL(`https://api.opensea.io/api/v2/chain/${chain}/account/${walletAddress}/nfts`);
        url.searchParams.set('limit', String(parsed.data.limit));
        if (cursor) url.searchParams.set('next', cursor);
        try {
          for (let attempt = 0; attempt < 2; attempt++) {
            const response = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { accept: 'application/json', 'x-api-key': OPENSEA_API_KEY } });
            if (response.status === 429 && attempt === 0) { await response.text(); await sleep(1000); continue; }
            if (!response.ok) { errorsByChain[chain] = `HTTP ${response.status}: ${await response.text()}`; return; }
            const data = await response.json();
            fetchedChains.push(chain);
            const page = (Array.isArray(data.nfts) ? data.nfts : []).filter((n: any) => {
              const collection = typeof n.collection === 'string' ? n.collection : n.collection?.slug || '';
              return n.contract?.toLowerCase() !== '0x22c1f6050e56d2876009903609a2cc3fef83b415' && !collection.toLowerCase().includes('poap');
            });
            allNfts.push(...page.map((n: any) => ({ ...n, chain })));
            if (data.next) positions[chain] = data.next;
            else delete positions[chain];
            return;
          }
        } catch (error) { errorsByChain[chain] = String(error); }
      }));
    }
    const next = Object.keys(positions).length ? JSON.stringify({ wallet: walletAddress.toLowerCase(), positions }) : null;

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
        next,
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
