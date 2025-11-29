import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createPublicClient, http } from 'npm:viem@2.x';
import { mainnet } from 'npm:viem@2.x/chains';
import { normalize } from 'npm:viem@2.x/ens';

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

    // For .box domains, resolve to address first
    let lookupHandle = handle;
    if (handle.toLowerCase().endsWith('.box')) {
      console.log('🔗 Detected .box domain, resolving to address first...');
      try {
        const publicClient = createPublicClient({
          chain: mainnet,
          transport: http()
        });
        
        // Add 5-second timeout to ENS resolution
        const resolveWithTimeout = Promise.race([
          publicClient.getEnsAddress({
            name: normalize(handle)
          }),
          new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error('ENS resolution timeout after 5 seconds')), 5000)
          )
        ]);
        
        const address = await resolveWithTimeout;
        
        if (address) {
          console.log('✅ Resolved .box domain to address:', address);
          lookupHandle = address;
        } else {
          console.warn('⚠️ Could not resolve .box domain, trying original handle');
        }
      } catch (ensError: any) {
        console.warn('⚠️ .box domain resolution failed:', ensError.message);
        // Continue with original handle if resolution fails
      }
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

        // Call web3.bio API with timeout (use resolved address for .box domains)
        const apiUrl = `https://api.web3.bio/profile/${lookupHandle}`;
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
          
          // If 404 (not found), don't retry - return 200 with notFound flag
          if (response.status === 404) {
            return new Response(JSON.stringify({ 
              data: null, 
              notFound: true,
              message: 'Profile not found' 
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
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
