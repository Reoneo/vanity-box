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
    const { handle } = await req.json();
    
    console.log('🔍 Web3.bio lookup request for handle:', handle);
    
    if (!handle) {
      throw new Error('Handle is required');
    }

    const WEB3BIO_API_KEY = Deno.env.get('WEB3BIO_API_KEY');
    
    if (!WEB3BIO_API_KEY) {
      console.error('❌ WEB3BIO_API_KEY not configured');
      throw new Error('WEB3BIO_API_KEY not configured');
    }

    // Retry logic with exponential backoff
    const maxRetries = 3;
    const retryDelays = [1000, 2000, 4000]; // 1s, 2s, 4s
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 Retry attempt ${attempt + 1}/${maxRetries} after ${retryDelays[attempt - 1]}ms`);
          await new Promise(resolve => setTimeout(resolve, retryDelays[attempt - 1]));
        }

        // Call web3.bio API with timeout
        const apiUrl = `https://api.web3.bio/profile/${handle}`;
        console.log(`📡 Calling Web3.bio API (attempt ${attempt + 1}):`, apiUrl);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${WEB3BIO_API_KEY}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log('📥 Web3.bio response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Web3.bio API error:', response.status, errorText);
          
          // If 500 error, retry
          if (response.status >= 500 && attempt < maxRetries - 1) {
            lastError = new Error(`Web3.bio API error: ${response.status}`);
            continue;
          }
          
          throw new Error(`Web3.bio API error: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Web3.bio profile data received:', JSON.stringify(data).substring(0, 200));

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (fetchError: any) {
        lastError = fetchError;
        
        // If it's an abort error or network error, retry
        if ((fetchError.name === 'AbortError' || fetchError.message.includes('fetch')) && attempt < maxRetries - 1) {
          console.warn(`⚠️ Attempt ${attempt + 1} failed:`, fetchError.message);
          continue;
        }
        
        // If last attempt or non-retryable error, throw
        if (attempt === maxRetries - 1) {
          throw lastError;
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');

  } catch (error: any) {
    console.error('❌ Error fetching web3.bio profile:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
