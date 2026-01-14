import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Browser-like headers to avoid being blocked
const fetchHeaders = {
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (compatible; vanity.box/1.0)',
};

interface PolymarketPosition {
  market: string;
  outcome: string;
  shares: number;
  value: number;
  avgPrice: number;
  icon?: string;
  status?: string;
  profit?: number;
  percentPnl?: number;
}

interface PolymarketData {
  totalValue: number;
  winRate: number | null;
  openPositions: PolymarketPosition[];
  closedPositions: number;
  totalTrades: number;
  profit: number;
  profile?: {
    avatar?: string;
    displayName?: string;
    joinedDate?: string;
  };
}

async function fetchPolymarketDataForWallet(wallet: string): Promise<{
  positions: PolymarketPosition[];
  activity: any[];
  profile: PolymarketData['profile'];
}> {
  const lowerWallet = wallet.toLowerCase();
  
  // Fetch positions, activity, and profile in parallel
  const [positionsRes, activityRes] = await Promise.allSettled([
    fetch(`https://data-api.polymarket.com/positions?user=${lowerWallet}&sizeThreshold=0&limit=100`, { headers: fetchHeaders }),
    fetch(`https://data-api.polymarket.com/activity?user=${lowerWallet}&limit=100`, { headers: fetchHeaders }),
  ]);

  let positions: PolymarketPosition[] = [];
  let activity: any[] = [];
  let profile: PolymarketData['profile'] = undefined;

  // Parse positions
  if (positionsRes.status === 'fulfilled' && positionsRes.value.ok) {
    try {
      const data = await positionsRes.value.json();
      if (Array.isArray(data)) {
        positions = data.map((p: any) => ({
          market: p.title || p.question || 'Unknown Market',
          outcome: p.outcome || 'Unknown',
          shares: parseFloat(p.size) || 0,
          value: parseFloat(p.currentValue) || parseFloat(p.size) * (parseFloat(p.curPrice) || 0),
          avgPrice: parseFloat(p.avgPrice) || 0,
          icon: p.icon || undefined,
          status: p.redeemable ? 'Closed' : 'Open',
          profit: parseFloat(p.cashPnl) || parseFloat(p.realizedPnl) || 0,
          percentPnl: parseFloat(p.percentPnl) || parseFloat(p.percentRealizedPnl) || 0,
        }));
      }
    } catch (e) {
      console.error('[Polymarket] Error parsing positions:', e);
    }
  }

  // Parse activity
  if (activityRes.status === 'fulfilled' && activityRes.value.ok) {
    try {
      const data = await activityRes.value.json();
      if (Array.isArray(data)) {
        activity = data;
      }
    } catch (e) {
      console.error('[Polymarket] Error parsing activity:', e);
    }
  }

  return { positions, activity, profile };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { wallet } = await req.json();

    if (!wallet) {
      return new Response(
        JSON.stringify({ error: 'Wallet address is required', noData: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Polymarket] Fetching data for wallet:', wallet);

    // Step 1: Fetch public profile from gamma-api to get proxyWallet
    let proxyWallet: string | null = null;
    let profile: PolymarketData['profile'] = undefined;

    try {
      const profileUrl = `https://gamma-api.polymarket.com/public-profile?address=${wallet.toLowerCase()}`;
      console.log('[Polymarket] Fetching gamma profile from:', profileUrl);
      
      const profileRes = await fetch(profileUrl, { headers: fetchHeaders });
      
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        console.log('[Polymarket] Gamma profile data:', JSON.stringify(profileData).slice(0, 800));
        
        if (profileData && typeof profileData === 'object') {
          proxyWallet = profileData.proxyWallet || profileData.proxy_wallet || null;
          profile = {
            avatar: profileData.profileImage || profileData.avatar || profileData.pfp || profileData.profilePicture,
            displayName: profileData.name || profileData.username || profileData.displayName || profileData.pseudonym,
            joinedDate: profileData.createdAt 
              ? new Date(profileData.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : undefined,
          };
          console.log('[Polymarket] Found proxyWallet:', proxyWallet);
        }
      } else {
        console.log('[Polymarket] Gamma profile request failed:', profileRes.status);
      }
    } catch (e) {
      console.error('[Polymarket] Error fetching gamma profile:', e);
    }

    // Step 2: Fetch positions/activity using main wallet first
    let { positions, activity } = await fetchPolymarketDataForWallet(wallet);
    console.log('[Polymarket] Main wallet - Positions:', positions.length, 'Activity:', activity.length);

    // Step 3: If no data and proxyWallet exists and is different, try with proxy
    if (positions.length === 0 && activity.length === 0 && proxyWallet && proxyWallet.toLowerCase() !== wallet.toLowerCase()) {
      console.log('[Polymarket] Trying with proxyWallet:', proxyWallet);
      const proxyResult = await fetchPolymarketDataForWallet(proxyWallet);
      positions = proxyResult.positions;
      activity = proxyResult.activity;
      console.log('[Polymarket] Proxy wallet - Positions:', positions.length, 'Activity:', activity.length);
    }

    // Step 4: Calculate metrics
    let totalValue = 0;
    let closedPositions = 0;
    let totalTrades = 0;
    let wins = 0;
    let losses = 0;
    let profit = 0;

    // Process positions
    positions.forEach((p) => {
      totalValue += p.value;
      profit += p.profit || 0;
      
      if (p.status === 'Closed') {
        closedPositions++;
        if ((p.profit || 0) > 0) wins++;
        else if ((p.profit || 0) < 0) losses++;
      }
    });
    
    totalTrades = positions.length;

    // Supplement from activity if needed
    if (activity.length > 0) {
      if (totalTrades === 0) {
        totalTrades = activity.length;
      }
      
      if (profit === 0) {
        activity.forEach((trade: any) => {
          const pnl = parseFloat(trade.profit) || parseFloat(trade.pnl) || parseFloat(trade.cashPnl) || 0;
          profit += pnl;
          
          if (trade.type === 'redeem' || trade.type === 'sell') {
            if (wins + losses === 0) {
              closedPositions++;
              if (pnl > 0) wins++;
              else if (pnl < 0) losses++;
            }
          }
        });
      }
    }

    // Calculate win rate
    const winRate = (wins + losses) > 0 
      ? Math.round((wins / (wins + losses)) * 100) 
      : null;

    // Check if we have any data
    if (positions.length === 0 && activity.length === 0) {
      console.log('[Polymarket] No data found for wallet (tried proxy too)');
      return new Response(
        JSON.stringify({ noData: true, profile }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: PolymarketData = {
      totalValue,
      winRate,
      openPositions: positions,
      closedPositions,
      totalTrades,
      profit,
      profile,
    };

    console.log('[Polymarket] Returning data with', positions.length, 'positions, totalTrades:', totalTrades);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Polymarket] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch Polymarket data', noData: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
