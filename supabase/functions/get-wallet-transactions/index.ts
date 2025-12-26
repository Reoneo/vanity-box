import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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
        JSON.stringify({ error: 'walletAddress is required', transactions: [] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate EVM address format
    if (!/^0x[a-fA-F0-9]{40}$/i.test(walletAddress)) {
      console.log(`Invalid EVM address format: ${walletAddress}`);
      return new Response(
        JSON.stringify({ error: 'Invalid EVM address format', transactions: [] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get and clean the API key
    const rawKey = Deno.env.get('ZERION_API_KEY') || '';
    const ZERION_API_KEY = rawKey.trim().replace(/[\r\n\t]/g, '');
    
    if (!ZERION_API_KEY) {
      console.error('ZERION_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Zerion API key not configured', transactions: [] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching transactions for wallet: ${walletAddress}`);

    // Use Deno's base64 encoder for reliability
    const credentials = `${ZERION_API_KEY}:`;
    const encoder = new TextEncoder();
    const credentialsBytes = encoder.encode(credentials);
    const base64Credentials = base64Encode(credentialsBytes);
    const authHeader = `Basic ${base64Credentials}`;

    // Fetch transactions from Zerion
    const transactionsUrl = `https://api.zerion.io/v1/wallets/${walletAddress}/transactions/?currency=usd&page[size]=${limit}&filter[trash]=only_non_trash`;
    
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
      
      return new Response(
        JSON.stringify({ 
          transactions: [], 
          error: `Zerion API error: ${response.status}`,
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
          type: transfer.direction,
          value: transfer.value,
          quantity: transfer.quantity?.float,
          symbol: transfer.fungible_info?.symbol,
          name: transfer.fungible_info?.name,
          icon: transfer.fungible_info?.icon?.url,
        })),
        chain: tx.relationships?.chain?.data?.id,
      };
    });

    console.log(`Returning ${transactions.length} transactions`);

    return new Response(
      JSON.stringify({ transactions, total: transactions.length }),
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
