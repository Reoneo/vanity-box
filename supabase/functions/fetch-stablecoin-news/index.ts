import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching CoinDesk RSS feed for stablecoin news...');
    
    // Fetch CoinDesk RSS feed
    const rssUrl = 'https://www.coindesk.com/arc/outboundfeeds/rss/';
    const response = await fetch(rssUrl);
    const rssText = await response.text();
    
    console.log('RSS feed fetched successfully');
    
    // Parse RSS XML
    const items: any[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>/;
    const linkRegex = /<link>(.*?)<\/link>/;
    const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;
    
    let match;
    while ((match = itemRegex.exec(rssText)) !== null && items.length < 20) {
      const itemContent = match[1];
      const titleMatch = titleRegex.exec(itemContent);
      const linkMatch = linkRegex.exec(itemContent);
      const dateMatch = pubDateRegex.exec(itemContent);
      
      const title = titleMatch ? titleMatch[1] : '';
      
      // Filter for stablecoin-related news
      const stablecoinKeywords = ['stablecoin', 'usdt', 'usdc', 'dai', 'tusd', 'pyusd', 'fdusd', 'eurc', 'tether', 'circle'];
      const isRelevant = stablecoinKeywords.some(keyword => 
        title.toLowerCase().includes(keyword)
      );
      
      if (isRelevant && linkMatch && dateMatch) {
        items.push({
          title: title,
          url: linkMatch[1],
          source: 'CoinDesk',
          time: dateMatch[1]
        });
      }
    }
    
    console.log(`Found ${items.length} stablecoin-related news items`);
    
    return new Response(
      JSON.stringify({ items: items.slice(0, 10) }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error fetching stablecoin news:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch news', items: [] }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
