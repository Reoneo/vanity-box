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
}

interface PolymarketData {
  totalValue: number;
  winRate: number | null;
  openPositions: PolymarketPosition[];
  closedPositions: number;
  totalTrades: number;
  profit: number;
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
    // Using the public endpoints that don't require API key
    const positionsUrl = `https://data-api.polymarket.com/positions?user=${wallet.toLowerCase()}`;
    const activityUrl = `https://data-api.polymarket.com/activity?user=${wallet.toLowerCase()}&limit=100`;

    const [positionsRes, activityRes] = await Promise.allSettled([
      fetch(positionsUrl, {
        headers: { 'Accept': 'application/json' }
      }),
      fetch(activityUrl, {
        headers: { 'Accept': 'application/json' }
      })
    ]);

    let openPositions: PolymarketPosition[] = [];
    let totalValue = 0;
    let closedPositions = 0;
    let totalTrades = 0;
    let wins = 0;
    let losses = 0;
    let profit = 0;

    // Parse positions response
    if (positionsRes.status === 'fulfilled' && positionsRes.value.ok) {
      try {
        const positionsData = await positionsRes.value.json();
        console.log('[Polymarket] Positions data:', JSON.stringify(positionsData).slice(0, 500));
        
        if (Array.isArray(positionsData)) {
          openPositions = positionsData
            .filter((p: any) => p.size > 0)
            .map((p: any) => ({
              market: p.title || p.question || 'Unknown Market',
              outcome: p.outcome || 'Unknown',
              shares: parseFloat(p.size) || 0,
              value: parseFloat(p.currentValue) || parseFloat(p.size) * (parseFloat(p.price) || 0),
              avgPrice: parseFloat(p.avgPrice) || parseFloat(p.price) || 0,
            }));

          totalValue = openPositions.reduce((sum, p) => sum + p.value, 0);
        }
      } catch (e) {
        console.error('[Polymarket] Error parsing positions:', e);
      }
    } else {
      console.log('[Polymarket] Positions request failed or rejected');
    }

    // Parse activity response for trade history and win rate calculation
    if (activityRes.status === 'fulfilled' && activityRes.value.ok) {
      try {
        const activityData = await activityRes.value.json();
        console.log('[Polymarket] Activity data count:', Array.isArray(activityData) ? activityData.length : 'not array');
        
        if (Array.isArray(activityData)) {
          totalTrades = activityData.length;
          
          // Calculate P&L and win/loss from trades
          activityData.forEach((trade: any) => {
            const pnl = parseFloat(trade.profit) || parseFloat(trade.pnl) || 0;
            profit += pnl;
            
            if (trade.type === 'redeem' || trade.type === 'sell') {
              closedPositions++;
              if (pnl > 0) wins++;
              else if (pnl < 0) losses++;
            }
          });
        }
      } catch (e) {
        console.error('[Polymarket] Error parsing activity:', e);
      }
    } else {
      console.log('[Polymarket] Activity request failed or rejected');
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
    };

    console.log('[Polymarket] Returning data:', JSON.stringify(result).slice(0, 300));

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
