import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 's-maxage=60, stale-while-revalidate=120',
};

const fetchHeaders = {
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (compatible; vanity.box/1.0)',
};

const DATA_API_BASE = 'https://data-api.polymarket.com';
const GAMMA_API_BASE = 'https://gamma-api.polymarket.com';

interface PolymarketPosition {
  market: string;
  outcome: string;
  shares: number;
  value: number;
  avgPrice: number;
  icon?: string;
  status: 'Open' | 'Closed';
  profit: number;
  percentPnl: number;
  conditionId?: string;
  createdAt?: string;
}

interface ClosedPosition {
  market: string;
  outcome: string;
  realizedPnl: number;
  percentPnl: number;
  size: number;
  avgPrice: number;
  icon?: string;
  settledAt?: string;
  conditionId?: string;
}

interface PolymarketResponse {
  ok: boolean;
  effectiveAddress: string;
  usedOverride: boolean;
  positions: PolymarketPosition[];
  closedPositions: ClosedPosition[];
  stats: {
    profitUsd: number;
    winRate: number | null;
    openPositionsCount: number;
    closedPositionsCount: number;
    totalTrades: number;
  };
  topPositions: ClosedPosition[];
  profile?: {
    avatar?: string;
    displayName?: string;
    joinedDate?: string;
  };
  error?: string;
  status?: number;
}

// Validate Ethereum address
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Fetch all pages of a paginated endpoint
async function fetchAllPages<T>(
  baseUrl: string,
  params: Record<string, string>,
  limit: number = 100,
  maxPages: number = 10
): Promise<T[]> {
  const results: T[] = [];
  let offset = 0;
  let page = 0;

  while (page < maxPages) {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    url.searchParams.set('limit', limit.toString());
    url.searchParams.set('offset', offset.toString());

    console.log(`[Polymarket] Fetching page ${page + 1}: ${url.toString()}`);

    try {
      const res = await fetch(url.toString(), { headers: fetchHeaders });
      
      if (!res.ok) {
        console.error(`[Polymarket] Request failed: ${res.status} ${res.statusText}`);
        break;
      }

      const data = await res.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        console.log(`[Polymarket] No more data on page ${page + 1}`);
        break;
      }

      results.push(...data);
      console.log(`[Polymarket] Page ${page + 1}: got ${data.length} items, total: ${results.length}`);

      if (data.length < limit) {
        break; // Last page
      }

      offset += limit;
      page++;
    } catch (err) {
      console.error(`[Polymarket] Fetch error on page ${page + 1}:`, err);
      break;
    }
  }

  return results;
}

// Fetch open positions
async function fetchPositions(address: string, limit: number, maxPages: number): Promise<PolymarketPosition[]> {
  const rawPositions = await fetchAllPages<any>(
    `${DATA_API_BASE}/positions`,
    { user: address.toLowerCase(), sizeThreshold: '0' },
    limit,
    maxPages
  );

  return rawPositions.map((p: any) => ({
    market: p.title || p.question || 'Unknown Market',
    outcome: p.outcome || 'Unknown',
    shares: parseFloat(p.size) || 0,
    value: parseFloat(p.currentValue) || parseFloat(p.size) * (parseFloat(p.curPrice) || 0),
    avgPrice: parseFloat(p.avgPrice) || 0,
    icon: p.icon || undefined,
    status: p.redeemable ? 'Closed' as const : 'Open' as const,
    profit: parseFloat(p.cashPnl) || parseFloat(p.realizedPnl) || 0,
    percentPnl: parseFloat(p.percentPnl) || parseFloat(p.percentRealizedPnl) || 0,
    conditionId: p.conditionId,
    createdAt: p.createdAt,
  }));
}

// Fetch closed positions from the v1 endpoint
async function fetchClosedPositions(address: string, limit: number, maxPages: number): Promise<ClosedPosition[]> {
  const rawClosed = await fetchAllPages<any>(
    `${DATA_API_BASE}/v1/closed-positions`,
    { user: address.toLowerCase() },
    Math.min(limit, 50), // API seems to limit to 50
    maxPages
  );

  return rawClosed.map((p: any) => ({
    market: p.title || p.question || p.market || 'Unknown Market',
    outcome: p.outcome || 'Unknown',
    realizedPnl: parseFloat(p.realizedPnl) || parseFloat(p.pnl) || parseFloat(p.profit) || 0,
    percentPnl: parseFloat(p.percentPnl) || parseFloat(p.percentRealizedPnl) || 0,
    size: parseFloat(p.size) || parseFloat(p.shares) || 0,
    avgPrice: parseFloat(p.avgPrice) || 0,
    icon: p.icon || undefined,
    settledAt: p.settledAt || p.closedAt || p.updatedAt,
    conditionId: p.conditionId,
  }));
}

// Fetch profile from Gamma API
async function fetchProfile(address: string): Promise<{ profile: PolymarketResponse['profile']; proxyWallet?: string }> {
  try {
    const url = `${GAMMA_API_BASE}/public-profile?address=${address.toLowerCase()}`;
    console.log('[Polymarket] Fetching profile from:', url);

    const res = await fetch(url, { headers: fetchHeaders });
    
    if (!res.ok) {
      console.log('[Polymarket] Profile request failed:', res.status);
      return { profile: undefined };
    }

    const data = await res.json();
    console.log('[Polymarket] Profile data:', JSON.stringify(data).slice(0, 500));

    if (data && typeof data === 'object') {
      return {
        profile: {
          avatar: data.profileImage || data.avatar || data.pfp || data.profilePicture,
          displayName: data.name || data.username || data.displayName || data.pseudonym,
          joinedDate: data.createdAt
            ? new Date(data.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : undefined,
        },
        proxyWallet: data.proxyWallet || data.proxy_wallet || undefined,
      };
    }
  } catch (err) {
    console.error('[Polymarket] Profile fetch error:', err);
  }

  return { profile: undefined };
}

// Compute stats from positions
function computeStats(
  positions: PolymarketPosition[],
  closedPositions: ClosedPosition[]
): PolymarketResponse['stats'] {
  // Calculate profit from closed positions
  const profitUsd = closedPositions.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);

  // Calculate win rate
  const wins = closedPositions.filter(p => p.realizedPnl > 0).length;
  const losses = closedPositions.filter(p => p.realizedPnl < 0).length;
  const winRate = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : null;

  return {
    profitUsd,
    winRate,
    openPositionsCount: positions.filter(p => p.status === 'Open').length,
    closedPositionsCount: closedPositions.length,
    totalTrades: positions.length + closedPositions.length,
  };
}

// Get top positions by absolute PnL
function getTopPositions(closedPositions: ClosedPosition[], count: number = 3): ClosedPosition[] {
  return [...closedPositions]
    .sort((a, b) => Math.abs(b.realizedPnl) - Math.abs(a.realizedPnl))
    .slice(0, count);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { wallet, walletAddress, polymarketProfileAddress, limit = 100, maxPages = 5 } = body;
    
    // Support both 'wallet' and 'walletAddress' for backwards compatibility
    const inputWallet = walletAddress || wallet;

    if (!inputWallet) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Wallet address is required', status: 400 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!isValidAddress(inputWallet)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid wallet address format', status: 400 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('[Polymarket] Request for wallet:', inputWallet);

    // Check for profile override in database
    let overrideAddress: string | undefined = polymarketProfileAddress;
    let usedOverride = false;

    if (!overrideAddress) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: overrideData } = await supabase
          .from('polymarket_profile_overrides')
          .select('polymarket_profile_address')
          .eq('wallet_address', inputWallet.toLowerCase())
          .single();

        if (overrideData?.polymarket_profile_address) {
          overrideAddress = overrideData.polymarket_profile_address;
          console.log('[Polymarket] Using DB override:', overrideAddress);
        }
      } catch (err) {
        console.log('[Polymarket] No DB override found or error:', err);
      }
    }

    // Determine effective address
    let effectiveAddress = overrideAddress || inputWallet;
    usedOverride = !!overrideAddress;

    if (overrideAddress && !isValidAddress(overrideAddress)) {
      console.log('[Polymarket] Invalid override address, using wallet');
      effectiveAddress = inputWallet;
      usedOverride = false;
    }

    console.log('[Polymarket] Effective address:', effectiveAddress, 'usedOverride:', usedOverride);

    // Fetch profile first (to get proxy wallet if needed)
    const { profile, proxyWallet } = await fetchProfile(effectiveAddress);

    // Fetch positions and closed positions in parallel
    let [positions, closedPositions] = await Promise.all([
      fetchPositions(effectiveAddress, limit, maxPages),
      fetchClosedPositions(effectiveAddress, limit, maxPages),
    ]);

    console.log('[Polymarket] Initial fetch - positions:', positions.length, 'closed:', closedPositions.length);

    // If no data and proxy wallet exists, try with proxy
    if (positions.length === 0 && closedPositions.length === 0 && proxyWallet && proxyWallet.toLowerCase() !== effectiveAddress.toLowerCase()) {
      console.log('[Polymarket] Trying with proxyWallet:', proxyWallet);
      
      const [proxyPositions, proxyClosedPositions] = await Promise.all([
        fetchPositions(proxyWallet, limit, maxPages),
        fetchClosedPositions(proxyWallet, limit, maxPages),
      ]);

      if (proxyPositions.length > 0 || proxyClosedPositions.length > 0) {
        positions = proxyPositions;
        closedPositions = proxyClosedPositions;
        effectiveAddress = proxyWallet;
        console.log('[Polymarket] Proxy fetch - positions:', positions.length, 'closed:', closedPositions.length);
      }
    }

    // Check if we have any data
    if (positions.length === 0 && closedPositions.length === 0) {
      console.log('[Polymarket] No data found for wallet');
      return new Response(
        JSON.stringify({
          ok: true,
          noData: true,
          effectiveAddress,
          usedOverride,
          positions: [],
          closedPositions: [],
          stats: {
            profitUsd: 0,
            winRate: null,
            openPositionsCount: 0,
            closedPositionsCount: 0,
            totalTrades: 0,
          },
          topPositions: [],
          profile,
          // Backwards compatibility fields
          totalValue: 0,
          winRate: null,
          openPositions: [],
          totalTrades: 0,
          profit: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Compute stats
    const stats = computeStats(positions, closedPositions);
    const topPositions = getTopPositions(closedPositions, 3);

    // Calculate total value for backwards compatibility
    const totalValue = positions.reduce((sum, p) => sum + p.value, 0);

    const response: PolymarketResponse = {
      ok: true,
      effectiveAddress,
      usedOverride,
      positions,
      closedPositions,
      stats,
      topPositions,
      profile,
    };

    // Add backwards compatibility fields
    const backwardsCompatResponse = {
      ...response,
      totalValue,
      winRate: stats.winRate,
      openPositions: positions,
      totalTrades: stats.totalTrades,
      profit: stats.profitUsd,
    };

    console.log('[Polymarket] Returning data - positions:', positions.length, 'closed:', closedPositions.length, 'profit:', stats.profitUsd);

    return new Response(
      JSON.stringify(backwardsCompatResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Polymarket] Error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to fetch Polymarket data', status: 500 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
