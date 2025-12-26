import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress, limit = 50 } = await req.json();

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'walletAddress is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get and trim the API key to remove any whitespace/hidden chars
    const rawKey = Deno.env.get('ZERION_API_KEY') || '';
    const ZERION_API_KEY = rawKey.trim();
    
    if (!ZERION_API_KEY) {
      console.error('ZERION_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Zerion API key not configured', transactions: [] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Debug: Log API key info to diagnose auth issues
    console.log(`Zerion API key length: ${ZERION_API_KEY.length}, first 8 chars: ${ZERION_API_KEY.substring(0, 8)}...`);
    console.log(`Fetching transactions for wallet: ${walletAddress}`);

    // Zerion API uses Basic auth: API_KEY as username, empty password
    const credentials = `${ZERION_API_KEY}:`;
    const base64Credentials = btoa(credentials);
    const authHeader = `Basic ${base64Credentials}`;

    console.log(`Auth header format: Basic ${base64Credentials.substring(0, 12)}...`);

    // Fetch transactions from Zerion
    const transactionsUrl = `https://api.zerion.io/v1/wallets/${walletAddress}/transactions/?currency=usd&page[size]=${limit}&filter[trash]=only_non_trash`;
    console.log(`Fetching transactions from: ${transactionsUrl}`);
    
    const response = await fetch(transactionsUrl, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    console.log(`Zerion API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Zerion transactions error: ${response.status} - ${errorText}`);
      
      // Enhanced 401 debugging
      if (response.status === 401) {
        console.error('=== 401 Unauthorized Debug Info ===');
        console.error(`API key length: ${ZERION_API_KEY.length}`);
        console.error(`API key starts with: ${ZERION_API_KEY.substring(0, 10)}`);
        console.error(`API key ends with: ${ZERION_API_KEY.substring(ZERION_API_KEY.length - 4)}`);
        console.error('Possible causes: key not activated, expired, or wrong format');
      }
      
      return new Response(
        JSON.stringify({ 
          transactions: [], 
          error: `Zerion API error: ${response.status}`,
          details: errorText.slice(0, 200)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log(`Found ${data.data?.length || 0} transactions`);

    const transactions = (data.data || []).map((tx: any) => {
      const attributes = tx.attributes;
      const transfers = attributes?.transfers || [];
      
      return {
        id: tx.id,
        hash: attributes?.hash,
        status: attributes?.status,
        type: attributes?.operation_type,
        minedAt: attributes?.mined_at,
        sentFrom: attributes?.sent_from,
        sentTo: attributes?.sent_to,
        fee: {
          value: attributes?.fee?.value,
          symbol: attributes?.fee?.fungible_info?.symbol,
        },
        transfers: transfers.map((transfer: any) => ({
          type: transfer.direction, // 'in' or 'out'
          value: transfer.value,
          quantity: transfer.quantity?.float,
          symbol: transfer.fungible_info?.symbol,
          name: transfer.fungible_info?.name,
          icon: transfer.fungible_info?.icon?.url,
        })),
        chain: tx.relationships?.chain?.data?.id,
      };
    });

    console.log(`Successfully fetched ${transactions.length} transactions`);

    return new Response(
      JSON.stringify({ 
        transactions,
        total: transactions.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-wallet-transactions:', error);
    return new Response(
      JSON.stringify({ error: error.message, transactions: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
