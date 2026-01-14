import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    // Fetch user's positions from Polymarket Data API
    const positionsUrl = `https://data-api.polymarket.com/positions?user=${wallet.toLowerCase()}&sizeThreshold=0&limit=100`;
    const activityUrl = `https://data-api.polymarket.com/activity?user=${wallet.toLowerCase()}&limit=100`;
    const profileUrl = `https://data-api.polymarket.com/profile?user=${wallet.toLowerCase()}`;

    const [positionsRes, activityRes, profileRes] = await Promise.allSettled([
      fetch(positionsUrl, { headers: { 'Accept': 'application/json' } }),
      fetch(activityUrl, { headers: { 'Accept': 'application/json' } }),
      fetch(profileUrl, { headers: { 'Accept': 'application/json' } }),
    ]);

    let openPositions: PolymarketPosition[] = [];
    let totalValue = 0;
    let closedPositions = 0;
    let totalTrades = 0;
    let wins = 0;
    let losses = 0;
    let profit = 0;
    let profile: PolymarketData['profile'] = undefined;

    // Parse profile response
    if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
      try {
        const profileData = await profileRes.value.json();
        console.log('[Polymarket] Profile data:', JSON.stringify(profileData).slice(0, 500));
        
        if (profileData && typeof profileData === 'object') {
          profile = {
            avatar: profileData.profilePicture || profileData.avatar || profileData.pfp,
            displayName: profileData.name || profileData.username || profileData.displayName,
            joinedDate: profileData.createdAt 
              ? new Date(profileData.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : undefined,
          };
        }
      } catch (e) {
        console.error('[Polymarket] Error parsing profile:', e);
      }
    }

    // Parse positions response
    if (positionsRes.status === 'fulfilled' && positionsRes.value.ok) {
      try {
        const positionsData = await positionsRes.value.json();
        console.log('[Polymarket] Positions data count:', Array.isArray(positionsData) ? positionsData.length : 'not array');
        
        if (Array.isArray(positionsData)) {
          openPositions = positionsData
            .map((p: any) => ({
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

          // Calculate totals from positions
          openPositions.forEach((p) => {
            totalValue += p.value;
            profit += p.profit || 0;
            
            if (p.status === 'Closed') {
              closedPositions++;
              if ((p.profit || 0) > 0) wins++;
              else if ((p.profit || 0) < 0) losses++;
            }
          });
          
          totalTrades = openPositions.length;
        }
      } catch (e) {
        console.error('[Polymarket] Error parsing positions:', e);
      }
    } else {
      console.log('[Polymarket] Positions request failed or rejected');
    }

    // Parse activity response for additional trade history
    if (activityRes.status === 'fulfilled' && activityRes.value.ok) {
      try {
        const activityData = await activityRes.value.json();
        console.log('[Polymarket] Activity data count:', Array.isArray(activityData) ? activityData.length : 'not array');
        
        if (Array.isArray(activityData) && activityData.length > 0) {
          // Use activity for trade count if positions were empty
          if (totalTrades === 0) {
            totalTrades = activityData.length;
          }
          
          // Calculate P&L from activity if we didn't get it from positions
          if (profit === 0) {
            activityData.forEach((trade: any) => {
              const pnl = parseFloat(trade.profit) || parseFloat(trade.pnl) || parseFloat(trade.cashPnl) || 0;
              profit += pnl;
              
              if (trade.type === 'redeem' || trade.type === 'sell') {
                if (wins + losses === 0) { // Only count if not already counted
                  closedPositions++;
                  if (pnl > 0) wins++;
                  else if (pnl < 0) losses++;
                }
              }
            });
          }
        }
      } catch (e) {
        console.error('[Polymarket] Error parsing activity:', e);
      }
    }

    // Calculate win rate if we have closed positions
    const winRate = (wins + losses) > 0 
      ? Math.round((wins / (wins + losses)) * 100) 
      : null;

    // Check if we have any data
    if (openPositions.length === 0 && totalTrades === 0) {
      console.log('[Polymarket] No data found for wallet');
      return new Response(
        JSON.stringify({ noData: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: PolymarketData = {
      totalValue,
      winRate,
      openPositions,
      closedPositions,
      totalTrades,
      profit,
      profile,
    };

    console.log('[Polymarket] Returning data with', openPositions.length, 'positions');

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