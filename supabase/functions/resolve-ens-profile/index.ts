import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// Fetch profile from Web3.bio (handles .eth, .box, and reverse lookups)
async function fetchFromWeb3Bio(handle: string): Promise<any> {
  console.log('🌐 Fetching from Web3.bio:', handle);
  
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/get-web3bio-profile`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ handle }),
    }
  );

  if (!response.ok) {
    throw new Error(`Web3.bio error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.notFound) {
    return null;
  }

  return data;
}

serve(async (req) => {
  console.log('resolve-ens-profile: Function invoked, version 5.0 (Simplified)');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    console.log('resolve-ens-profile: Query received:', query);

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const trimmedQuery = query.trim().toLowerCase();
    console.log('resolve-ens-profile: Trimmed query:', trimmedQuery);

    const isBoxDomain = /\.box$/i.test(trimmedQuery);
    
    try {
      const profile = await fetchFromWeb3Bio(trimmedQuery);
      
      if (!profile || !profile.address) {
        console.log('❌ No profile found for:', trimmedQuery);
        return new Response(
          JSON.stringify({ 
            notFound: true,
            message: 'Profile not found',
            query: trimmedQuery
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Mark .box domains as ENS-compatible
      if (isBoxDomain) {
        profile.platform = 'ens';
        profile.isBoxDomain = true;
      }

      console.log('✅ Profile resolved:', profile.identity || trimmedQuery);
      
      return new Response(
        JSON.stringify(profile),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } catch (error: any) {
      console.error('❌ Profile resolution error:', error.message);
      throw error;
    }

  } catch (error: any) {
    console.error('❌ resolve-ens-profile error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to resolve ENS profile'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
