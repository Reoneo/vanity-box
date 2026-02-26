import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function safeParseJson<T = any>(text: string): T | null {
  try {
    return text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    return null;
  }
}

function pickBestDate(poap: any): Date | null {
  const start = poap?.event?.start_date;
  const end = poap?.event?.end_date;
  const year = poap?.event?.year;

  const parse = (v?: string) => {
    if (!v || typeof v !== "string") return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };

  return parse(start) || parse(end) || (typeof year === "number" ? new Date(Date.UTC(year, 0, 1)) : null);
}

// Get mint date (when token was created/minted)
function getMintDate(poap: any): Date | null {
  const created = poap?.created;
  if (!created || typeof created !== "string") return null;
  const d = new Date(created);
  return isNaN(d.getTime()) ? null : d;
}

function groupPoapsByMonth(poaps: any[]) {
  const map = new Map<string, { key: string; year: number; month: number; label: string; items: any[] }>();

  for (const p of poaps) {
    const d = pickBestDate(p);

    // Unknown bucket (kept last)
    if (!d) {
      const key = "unknown";
      if (!map.has(key)) {
        map.set(key, {
          key,
          year: 0,
          month: 0,
          label: "Unknown date",
          items: [],
        });
      }
      map.get(key)!.items.push(p);
      continue;
    }

    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1; // 1-12
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const label = `${MONTHS[month - 1]} ${year}`;

    if (!map.has(key)) {
      map.set(key, { key, year, month, label, items: [] });
    }

    map.get(key)!.items.push(p);
  }

  // Sort items newest -> oldest within each month
  for (const g of map.values()) {
    g.items.sort((a, b) => {
      const ad = pickBestDate(a)?.getTime() ?? 0;
      const bd = pickBestDate(b)?.getTime() ?? 0;
      return bd - ad;
    });
  }

  // Sort groups newest -> oldest, unknown last
  return Array.from(map.values()).sort((a, b) => {
    if (a.key === "unknown") return 1;
    if (b.key === "unknown") return -1;
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Safer body parsing (prevents crashes if body is empty/malformed)
    const rawText = await req.text();
    const parsed = safeParseJson<{ walletAddress?: any; offset?: number; limit?: number; countOnly?: boolean }>(rawText);

    const rawWalletAddress = parsed?.walletAddress;
    const offset = parsed?.offset ?? 0;
    const limit = parsed?.limit ?? 1000;
    const countOnly = parsed?.countOnly ?? false;

    // Sanitize walletAddress - handle MiniKit's undefined object format
    const walletAddress =
      rawWalletAddress && typeof rawWalletAddress === "object" && (rawWalletAddress as any)?._type === "undefined"
        ? undefined
        : typeof rawWalletAddress === "string" && rawWalletAddress !== "undefined" && rawWalletAddress.trim() !== ""
          ? rawWalletAddress.trim()
          : undefined;

    if (!walletAddress) {
      // Return 200 so UI can show an empty state without crashing
      return new Response(
        JSON.stringify({
          success: false,
          count: 0,
          totalCount: 0,
          poaps: [],
          groups: [],
          hasMore: false,
          error: "Wallet address is required",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`Fetching POAPs for wallet: ${walletAddress}, offset: ${offset}, limit: ${limit}, countOnly: ${countOnly}`);

    const poapApiKey = Deno.env.get("POAP_API_KEY");

    if (!poapApiKey) {
      console.error("POAP API key not configured");
      return new Response(
        JSON.stringify({
          success: false,
          count: 0,
          totalCount: 0,
          poaps: [],
          groups: [],
          hasMore: false,
          error: "POAP API key not configured",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Fetch ALL POAPs to get accurate total count
    // The POAP API doesn't support pagination, so we fetch everything
    const apiUrl = `https://api.poap.tech/actions/scan/${walletAddress}`;
    console.log("Calling POAP API:", apiUrl);

    const poapsResponse = await fetch(apiUrl, {
      headers: {
        "X-API-Key": poapApiKey,
        Accept: "application/json",
      },
    });

    console.log("POAP API response status:", poapsResponse.status);

    if (!poapsResponse.ok) {
      const errorText = await poapsResponse.text().catch(() => "");
      console.error("POAP API error status:", poapsResponse.status);
      console.error("POAP API error body:", errorText);
      console.error("POAP API error headers:", JSON.stringify(Object.fromEntries(poapsResponse.headers.entries())));

      // Return success:false with 200 status so the UI doesn't crash
      return new Response(
        JSON.stringify({
          success: false,
          count: 0,
          totalCount: 0,
          poaps: [],
          groups: [],
          hasMore: false,
          error: "Failed to fetch POAPs from API",
          details: errorText,
          status: poapsResponse.status,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const allPoaps = await poapsResponse.json();
    const safeAllPoaps = Array.isArray(allPoaps) ? allPoaps : [];
    const totalCount = safeAllPoaps.length;

    console.log(`Found ${totalCount} total POAPs for wallet ${walletAddress}`);

    // If countOnly is requested, return just the count
    if (countOnly) {
      return new Response(
        JSON.stringify({
          success: true,
          count: 0,
          totalCount,
          poaps: [],
          groups: [],
          hasMore: totalCount > 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Sort all POAPs by mint date (newest first) before pagination
    const sortedPoaps = safeAllPoaps.sort((a: any, b: any) => {
      const dateA = getMintDate(a)?.getTime() ?? pickBestDate(a)?.getTime() ?? 0;
      const dateB = getMintDate(b)?.getTime() ?? pickBestDate(b)?.getTime() ?? 0;
      return dateB - dateA;
    });

    // Apply pagination
    const paginatedPoaps = sortedPoaps.slice(offset, offset + limit);
    const hasMore = offset + limit < totalCount;

    console.log(`Returning ${paginatedPoaps.length} POAPs (offset: ${offset}, hasMore: ${hasMore})`);

    // Add best date (useful for frontend sorting/debugging)
    const poapsWithDate = paginatedPoaps.map((p: any) => ({
      ...p,
      __bestDate: pickBestDate(p)?.toISOString() ?? null,
      __mintDate: getMintDate(p)?.toISOString() ?? null,
    }));

    // Group POAPs by month/year for UI
    const groups = groupPoapsByMonth(poapsWithDate);

    // Store POAPs in database (only the current batch)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Prepare POAP data for insertion
    const poapData = paginatedPoaps.map((poap: any) => ({
      wallet_address: walletAddress.toLowerCase(),
      event_id: poap.event.id,
      token_id: poap.tokenId,
      event_name: poap.event.name,
      event_description: poap.event.description,
      event_image_url: poap.event.image_url,
      event_year: poap.event.year,
      event_start_date: poap.event.start_date,
      event_end_date: poap.event.end_date,
      owner: poap.owner,
      chain: poap.chain,
    }));

    // Upsert POAPs (update if exists, insert if not)
    const { error: dbError } = await supabase.from("poap_tokens").upsert(poapData, {
      onConflict: "token_id",
      ignoreDuplicates: false,
    });

    if (dbError) {
      console.error("Error storing POAPs:", dbError);
      // Still return the POAPs even if storage fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: paginatedPoaps.length,
        totalCount,
        hasMore,
        offset,
        limit,

        // Keep original flat array (backwards compatible)
        poaps: poapsWithDate,

        // NEW: grouped by month/year for UI rendering
        groups,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("Error in get-poap-data function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        count: 0,
        totalCount: 0,
        poaps: [],
        groups: [],
        hasMore: false,
        error: error?.message || "An unexpected error occurred",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
