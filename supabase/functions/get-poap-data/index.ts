import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const monthNames = [
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
  // Prefer start_date, then end_date, then year fallback
  const start = poap?.event?.start_date;
  const end = poap?.event?.end_date;
  const year = poap?.event?.year;

  const tryDate = (v: any) => {
    if (!v || typeof v !== "string") return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };

  const d1 = tryDate(start);
  if (d1) return d1;

  const d2 = tryDate(end);
  if (d2) return d2;

  if (typeof year === "number" && year > 1970 && year < 3000) {
    const d3 = new Date(Date.UTC(year, 0, 1));
    return isNaN(d3.getTime()) ? null : d3;
  }

  return null;
}

function toMonthYearGroupKey(d: Date) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1; // 1-12
  const key = `${y}-${String(m).padStart(2, "0")}`;
  const label = `${monthNames[m - 1]} ${y}`;
  return { key, year: y, month: m, label };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Safer body parsing (prevents crashes if body is empty/malformed)
    const rawText = await req.text();
    const parsed = safeParseJson<{ walletAddress?: any }>(rawText);

    const rawWalletAddress = parsed?.walletAddress;

    // Normalize walletAddress (handle "undefined", objects, whitespace)
    const walletAddress =
      rawWalletAddress && typeof rawWalletAddress === "object" && (rawWalletAddress as any)?._type === "undefined"
        ? undefined
        : typeof rawWalletAddress === "string" && rawWalletAddress !== "undefined" && rawWalletAddress.trim() !== ""
          ? rawWalletAddress.trim()
          : undefined;

    if (!walletAddress) {
      return new Response(
        JSON.stringify({
          success: false,
          count: 0,
          poaps: [],
          groups: [],
          error: "Wallet address is required",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Fetching POAPs for wallet:", walletAddress);

    const poapApiKey = Deno.env.get("POAP_API_KEY");

    if (!poapApiKey) {
      console.error("POAP API key not configured");
      return new Response(
        JSON.stringify({
          success: false,
          count: 0,
          poaps: [],
          groups: [],
          error: "POAP API key not configured",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Fetch POAPs using X-API-Key (open endpoint)
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

      return new Response(
        JSON.stringify({
          success: false,
          count: 0,
          poaps: [],
          groups: [],
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

    const poaps = await poapsResponse.json();
    console.log(`Found ${poaps.length} POAPs for wallet ${walletAddress}`);

    // --- Group POAPs by Month + Year (for your UI) ---
    // Attach a best-effort date so frontend can reliably sort/display
    const poapsWithDate = (Array.isArray(poaps) ? poaps : []).map((p: any) => {
      const d = pickBestDate(p);
      return {
        ...p,
        __bestDate: d ? d.toISOString() : null,
      };
    });

    // Build groups
    const groupMap = new Map<string, { key: string; year: number; month: number; label: string; items: any[] }>();

    for (const p of poapsWithDate) {
      const d = p.__bestDate ? new Date(p.__bestDate) : null;

      // If no usable date, push into an "Unknown" bucket at the end
      if (!d || isNaN(d.getTime())) {
        const unknownKey = "unknown";
        if (!groupMap.has(unknownKey)) {
          groupMap.set(unknownKey, {
            key: unknownKey,
            year: 0,
            month: 0,
            label: "Unknown date",
            items: [],
          });
        }
        groupMap.get(unknownKey)!.items.push(p);
        continue;
      }

      const g = toMonthYearGroupKey(d);
      if (!groupMap.has(g.key)) {
        groupMap.set(g.key, { ...g, items: [] });
      }
      groupMap.get(g.key)!.items.push(p);
    }

    // Sort items inside groups (newest first)
    for (const g of groupMap.values()) {
      g.items.sort((a: any, b: any) => {
        const ad = a.__bestDate ? new Date(a.__bestDate).getTime() : 0;
        const bd = b.__bestDate ? new Date(b.__bestDate).getTime() : 0;
        return bd - ad;
      });
    }

    // Sort groups (newest month first; "Unknown date" last)
    const groups = Array.from(groupMap.values()).sort((a, b) => {
      if (a.key === "unknown") return 1;
      if (b.key === "unknown") return -1;

      // Compare year then month descending
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    // Store POAPs in database (your original behavior)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const poapData = (Array.isArray(poaps) ? poaps : []).map((poap: any) => ({
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

    const { error: dbError } = await supabase.from("poap_tokens").upsert(poapData, {
      onConflict: "token_id",
      ignoreDuplicates: false,
    });

    if (dbError) {
      console.error("Error storing POAPs:", dbError);
      // Still return success response with data
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: Array.isArray(poaps) ? poaps.length : 0,

        // keep original payload
        poaps,

        // NEW: grouped payload for UI
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
        poaps: [],
        groups: [],
        error: error?.message || "An unexpected error occurred",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
