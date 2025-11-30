import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WEB3BIO_API_KEY = Deno.env.get("WEB3BIO_API_KEY");

// Raw item from https://api.web3.bio/profile/{identity}
type Web3BioRawProfile = {
  address: string;
  identity: string;
  platform: string;
  displayName: string | null;
  avatar: string | null;
  description: string | null;
  email: string | null;
  location?: string | null;
  header?: string | null;
  contenthash?: string | null;
  links?: Record<
    string,
    {
      link: string;
      handle: string;
      sources?: string[];
    }
  >;
  social?: {
    uid?: number | null;
    follower?: number | null;
    following?: number | null;
  };
};

// Shape for ProfileCard
type SimpleProfile = {
  address: string;
  identity: string;
  platform: string;
  displayName: string | null;
  avatar: string | null;
  description: string | null;
  email: string | null;
  header: string | null;
  website: string | null;
  url: string | null;
  links: {
    key: string;
    link: string;
    handle: string;
  }[];
  followerCount: number | null;
  followingCount: number | null;
};

function pickPrimaryProfile(items: Web3BioRawProfile[]): Web3BioRawProfile | null {
  if (!items || items.length === 0) return null;

  // Prefer ENS, then Farcaster, then Lens, else the first one
  const preferredOrder = ["ens", "farcaster", "lens"];
  for (const platform of preferredOrder) {
    const found = items.find((p) => p.platform === platform);
    if (found) return found;
  }
  return items[0];
}

function normalizeProfile(raw: Web3BioRawProfile): SimpleProfile {
  const linksArray: SimpleProfile["links"] = [];
  if (raw.links) {
    for (const [key, value] of Object.entries(raw.links)) {
      linksArray.push({
        key,
        link: value.link,
        handle: value.handle,
      });
    }
  }

  // Website convenience field (from links.website if present)
  const website =
    raw.links?.website?.link ??
    raw.links?.website?.handle ??
    null;

  const followerCount = raw.social?.follower ?? null;
  const followingCount = raw.social?.following ?? null;

  return {
    address: raw.address,
    identity: raw.identity,
    platform: raw.platform,
    displayName: raw.displayName,
    avatar: raw.avatar,
    description: raw.description,
    email: raw.email,
    header: raw.header ?? null,
    website,
    url: website, // alias for ProfileCard
    links: linksArray,
    followerCount,
    followingCount,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!WEB3BIO_API_KEY) {
    console.error("❌ WEB3BIO_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "WEB3BIO_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { identity } = await req.json();
    const trimmed = (identity || "").trim();

    if (!trimmed) {
      return new Response(
        JSON.stringify({ error: "identity is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Web3.bio unified lookup for: ${trimmed}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    // Detect .box domains and use ENS-specific endpoint
    const isBoxDomain = trimmed.toLowerCase().endsWith('.box');
    const endpoint = isBoxDomain 
      ? `https://api.web3.bio/profile/ens/${encodeURIComponent(trimmed)}`
      : `https://api.web3.bio/profile/${encodeURIComponent(trimmed)}`;
    const url = endpoint;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-KEY": `Bearer ${WEB3BIO_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    console.log(`📥 Web3.bio response status: ${res.status}`);

    if (res.status === 404) {
      return new Response(
        JSON.stringify({
          notFound: true,
          profile: null,
          message: "Profile not found on Web3.bio",
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`❌ Web3.bio API error: ${res.status}`, text);
      return new Response(
        JSON.stringify({
          error: "Web3.bio API error",
          status: res.status,
          details: text || res.statusText,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const json = (await res.json()) as Web3BioRawProfile[] | Web3BioRawProfile;
    console.log(`✅ Web3.bio data received:`, JSON.stringify(json).substring(0, 200));

    // Universal endpoint returns an array; ENS-only endpoint returns single object
    const items = Array.isArray(json) ? json : [json];
    const primary = pickPrimaryProfile(items);

    if (!primary) {
      return new Response(
        JSON.stringify({
          notFound: true,
          profile: null,
          message: "No profile records returned from Web3.bio",
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const profile = normalizeProfile(primary);
    console.log(`✅ Primary profile selected: ${profile.platform} - ${profile.identity}`);

    return new Response(
      JSON.stringify({
        notFound: false,
        profile,
        platforms: items.map((p) => p.platform),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error("❌ web3bio-profile error:", err);
    return new Response(
      JSON.stringify({
        error: "Unexpected error querying Web3.bio",
        details: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
