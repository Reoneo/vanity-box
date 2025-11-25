// Deno edge function to mint .apt subdomains and record in database
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MintRequest {
  subdomain: string;
  walletAddress: string;
  domain: string;
  registrationMonths: number;
  paymentAmount?: number;
  paymentMethod?: string;
  txHash?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { 
      subdomain, 
      walletAddress, 
      domain, 
      registrationMonths,
      paymentAmount,
      paymentMethod,
      txHash
    }: MintRequest = await req.json();

    console.log(`[mint-apt-subdomain] Request:`, { 
      subdomain, 
      walletAddress, 
      domain, 
      registrationMonths,
      paymentAmount,
      paymentMethod,
      txHash 
    });

    // Validate input
    if (!subdomain || !walletAddress || !domain) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const fullName = `${subdomain}.${domain}`;
    
    // Calculate expiry date
    const registrationDate = new Date();
    const expiryDate = new Date(registrationDate);
    expiryDate.setMonth(expiryDate.getMonth() + registrationMonths);
    
    // Grace period is 30 days after expiry
    const gracePeriodEnd = new Date(expiryDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 30);

    // Store minting record in database
    const { data: mintRecord, error: dbError } = await supabase
      .from("minted_domains")
      .insert({
        subdomain,
        domain,
        full_name: fullName,
        wallet_address: walletAddress,
        registration_months: registrationMonths,
        registration_date: registrationDate.toISOString(),
        expiry_date: expiryDate.toISOString(),
        grace_period_end: gracePeriodEnd.toISOString(),
        payment_amount: paymentAmount || 0,
        payment_method: paymentMethod || "APT",
        tx_hash: txHash || null,
        network_fee: 0.001, // Aptos network fee (approximate)
        is_expired: false,
      })
      .select()
      .single();

    if (dbError) {
      console.error("[mint-apt-subdomain] Database error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to record minting in database", details: dbError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[mint-apt-subdomain] Successfully minted: ${fullName} for ${walletAddress}`);
    console.log(`[mint-apt-subdomain] Transaction hash: ${txHash}`);
    console.log(`[mint-apt-subdomain] Expiry date: ${expiryDate.toISOString()}`);

    // Set default redirect for the APT domain (BLOCKING with retries)
    console.log('[mint-apt-subdomain] Setting default redirect...');
    
    let redirectSuccess = false;
    let lastRedirectError = null;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[mint-apt-subdomain] Redirect attempt ${attempt}/${maxRetries}...`);
        
        const redirectResult = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/set-namestone-redirect`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({
              parentDomain: domain,
              subname: subdomain,
              redirectType: "default",
            }),
          }
        );
        
        if (!redirectResult.ok) {
          const errorText = await redirectResult.text();
          lastRedirectError = errorText;
          console.error(`[mint-apt-subdomain] ❌ Redirect attempt ${attempt} failed:`, {
            status: redirectResult.status,
            error: errorText,
            domain: `${subdomain}.${domain}`,
            timestamp: new Date().toISOString()
          });
          
          if (attempt < maxRetries) {
            const waitTime = attempt * 2000;
            console.log(`[mint-apt-subdomain] Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
          continue;
        }
        
        const redirectData = await redirectResult.json();
        
        if (redirectData?.error) {
          lastRedirectError = redirectData.error;
          console.error(`[mint-apt-subdomain] ❌ Redirect attempt ${attempt} returned error:`, {
            error: redirectData.error,
            domain: `${subdomain}.${domain}`,
            timestamp: new Date().toISOString()
          });
          
          if (attempt < maxRetries) {
            const waitTime = attempt * 2000;
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
          continue;
        }
        
        // Verify we got a CID and contenthash
        if (!redirectData?.cid || !redirectData?.contenthash) {
          lastRedirectError = 'Missing CID or contenthash in response';
          console.error(`[mint-apt-subdomain] ❌ Redirect attempt ${attempt} incomplete:`, {
            data: redirectData,
            domain: `${subdomain}.${domain}`,
            timestamp: new Date().toISOString()
          });
          
          if (attempt < maxRetries) {
            const waitTime = attempt * 2000;
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
          continue;
        }
        
        // Success!
        console.log('[mint-apt-subdomain] ✅ Redirect set successfully:', {
          domain: `${subdomain}.${domain}`,
          cid: redirectData.cid,
          contenthash: redirectData.contenthash,
          provider: redirectData.provider,
          attempt,
          timestamp: new Date().toISOString()
        });
        
        redirectSuccess = true;
        break;
        
      } catch (redirectErr: any) {
        lastRedirectError = redirectErr;
        console.error(`[mint-apt-subdomain] ❌ Redirect attempt ${attempt} exception:`, {
          error: redirectErr,
          message: redirectErr?.message,
          domain: `${subdomain}.${domain}`,
          timestamp: new Date().toISOString()
        });
        
        if (attempt < maxRetries) {
          const waitTime = attempt * 2000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    if (!redirectSuccess) {
      console.error('[mint-apt-subdomain] ⚠️ All redirect attempts failed, but mint succeeded:', {
        domain: `${subdomain}.${domain}`,
        lastError: lastRedirectError,
        timestamp: new Date().toISOString()
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Aptos subdomain successfully minted",
        fullName,
        walletAddress,
        registrationMonths,
        expiryDate: expiryDate.toISOString(),
        txHash,
        mintRecord,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("[mint-apt-subdomain] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to mint subdomain" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
