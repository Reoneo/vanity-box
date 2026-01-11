import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

const j = (body: any, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: CORS });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    console.log('[mint-subdomain] Request received');
    
    const rawBody = await req.text();
    
    if (!rawBody || rawBody.trim() === '') {
      return j({ ok: false, error: "Invalid request" }, 400);
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      return j({ ok: false, error: "Invalid request format" }, 400);
    }
    
    const { subdomain, walletAddress, domain, registrationMonths, paymentMethod, paymentAmount, networkFee, paymentReference } = body;

    console.log('[mint-subdomain] Request details:', { 
      subdomain, 
      domain, 
      walletAddress, 
      registrationMonths, 
      paymentMethod,
      paymentAmount,
      paymentReference,
      timestamp: new Date().toISOString()
    });

    // Validate required fields
    if (!subdomain || !walletAddress || !domain) {
      return j({ ok: false, error: "Missing required fields" }, 400);
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return j({ ok: false, error: "Invalid wallet address format" }, 400);
    }

    // Parse subdomain label and domain safely
    const subdomainLabel = String(subdomain).split(".")[0].trim().toLowerCase();
    const cleanDomain = String(domain).trim().toLowerCase();

    console.log(`[mint-subdomain] Parsed: label="${subdomainLabel}", domain="${cleanDomain}"`);

    // Validate subdomain label format (ENS-safe)
    if (!/^[a-z0-9-]{1,63}$/.test(subdomainLabel)) {
      return j({ ok: false, error: "Invalid subdomain format. Use only lowercase letters, numbers, and hyphens." }, 400);
    }

    if (!cleanDomain || cleanDomain.length === 0) {
      return j({ ok: false, error: "Invalid domain format" }, 400);
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // SECURITY: For paid mints, verify payment was completed
    let verifiedTxHash: string | null = null;
    
    if (paymentAmount && paymentAmount > 0 && paymentMethod !== 'FREE') {
      if (!paymentReference) {
        return j({ ok: false, error: "Payment reference required for paid mints" }, 400);
      }

      // Check payment reference exists and is verified
      const { data: paymentData, error: paymentError } = await supabase
        .from('payment_references')
        .select('*')
        .eq('reference', paymentReference)
        .single();

      if (paymentError || !paymentData) {
        console.error('[mint-subdomain] Payment reference not found:', paymentReference);
        return j({ ok: false, error: "Invalid payment reference" }, 400);
      }

      // Verify payment status
      if (paymentData.status !== 'verified') {
        console.error('[mint-subdomain] Payment not verified:', paymentData.status);
        return j({ ok: false, error: "Payment has not been verified" }, 400);
      }

      // Verify payment is for this subdomain and wallet
      if (paymentData.subdomain !== subdomainLabel || 
          paymentData.domain !== cleanDomain ||
          paymentData.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
        console.error('[mint-subdomain] Payment mismatch:', {
          expected: { subdomain: subdomainLabel, domain: cleanDomain, wallet: walletAddress.toLowerCase() },
          actual: { subdomain: paymentData.subdomain, domain: paymentData.domain, wallet: paymentData.wallet_address }
        });
        return j({ ok: false, error: "Payment does not match this subdomain" }, 400);
      }

      verifiedTxHash = paymentData.tx_hash;
      console.log('[mint-subdomain] Payment verified:', { reference: paymentReference, txHash: verifiedTxHash });
    }

    // Fetch domain config and API key from database
    console.log(`[mint-subdomain] Fetching domain config for: ${cleanDomain}`);
    
    const { data: domainConfig, error: configError } = await supabase
      .from("domain_configs")
      .select("*")
      .eq("domain_name", cleanDomain)
      .eq("status", "active")
      .maybeSingle();

    if (configError) {
      console.error("[mint-subdomain] Error fetching domain config:", configError.message);
      return j({ ok: false, error: "Unable to process request. Please try again." }, 500);
    }

    let namestoneApiKey: string | undefined;

    if (domainConfig) {
      console.log('[mint-subdomain] Domain config found:', {
        domain: cleanDomain,
        secretName: domainConfig.api_key_secret_name,
        status: domainConfig.status
      });
      namestoneApiKey = Deno.env.get(domainConfig.api_key_secret_name);
    } else {
      console.log('[mint-subdomain] No domain config, using default API key');
      namestoneApiKey = Deno.env.get("NAMESTONE_API_KEY");
    }

    if (!namestoneApiKey) {
      console.error(`[mint-subdomain] No API key found for domain: ${cleanDomain}`);
      return j({ ok: false, error: `Domain ${cleanDomain} is not available. Please contact support.` }, 500);
    }

    console.log(`[mint-subdomain] API key resolved for ${cleanDomain}`);

    // Calculate dates
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setMonth(expiryDate.getMonth() + (registrationMonths || 12));
    const gracePeriodEnd = new Date(expiryDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 90);

    // Call Namestone set-names API
    const namestonePayload = {
      domain: cleanDomain,
      names: [
        {
          name: subdomainLabel,
          address: walletAddress.toLowerCase(),
          text_records: {
            registration_months: String(registrationMonths || 12),
            expiry_date: expiryDate.toISOString(),
            grace_period_end: gracePeriodEnd.toISOString(),
          },
        },
      ],
    };

    console.log('[mint-subdomain] Calling Namestone API');
    const namestoneRes = await fetch("https://namestone.com/api/public_v1/set-names", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": namestoneApiKey,
      },
      body: JSON.stringify(namestonePayload),
    });

    console.log(`[mint-subdomain] Namestone response: ${namestoneRes.status}`);

    if (!namestoneRes.ok) {
      const errorText = await namestoneRes.text();
      console.error(`[mint-subdomain] Namestone error: ${namestoneRes.status}`);
      
      if (namestoneRes.status === 401) {
        return j({ 
          ok: false, 
          error: `Domain "${cleanDomain}" is not properly configured. Please contact support.` 
        }, 500);
      }
      
      return j({ ok: false, error: "Failed to register subdomain. Please try again." }, 500);
    }

    const namestoneData = await namestoneRes.json();
    console.log('[mint-subdomain] Namestone API success');

    // Record in minted_domains
    console.log('[mint-subdomain] Recording mint in database');
    
    const fullName = `${subdomainLabel}.${cleanDomain}`;
    
    // Check for existing record and clean up if needed
    const { data: existingRecord } = await supabase
      .from("minted_domains")
      .select("*")
      .eq("full_name", fullName)
      .eq("wallet_address", walletAddress.toLowerCase())
      .maybeSingle();

    if (existingRecord) {
      console.log('[mint-subdomain] Cleaning up existing record');
      await supabase
        .from("minted_domains")
        .delete()
        .eq("full_name", fullName)
        .eq("wallet_address", walletAddress.toLowerCase());
    }
    
    // Insert new record
    const { error: dbError } = await supabase.from("minted_domains").insert({
      full_name: fullName,
      subdomain: subdomainLabel,
      domain: cleanDomain,
      wallet_address: walletAddress.toLowerCase(),
      registration_months: registrationMonths || 12,
      registration_date: now.toISOString(),
      expiry_date: expiryDate.toISOString(),
      grace_period_end: gracePeriodEnd.toISOString(),
      payment_method: paymentMethod,
      payment_amount: paymentAmount,
      network_fee: networkFee,
      tx_hash: verifiedTxHash || `free-mint-${Date.now()}`,
    });

    if (dbError) {
      console.error("[mint-subdomain] DB Error:", dbError.message);
      
      if (dbError.code === '23505') {
        return j({ 
          ok: false, 
          error: `Domain "${fullName}" is already registered. Please try again in a moment.` 
        }, 409);
      }
      
      return j({ ok: false, error: "Failed to record domain registration. Please contact support." }, 500);
    }

    console.log('[mint-subdomain] Mint completed successfully:', fullName);

    // Set default redirect
    console.log('[mint-subdomain] Setting default redirect...');
    
    let redirectSuccess = false;
    let lastRedirectError = null;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[mint-subdomain] Redirect attempt ${attempt}/${maxRetries}`);
        
        const { data: redirectData, error: redirectError } = await supabase.functions.invoke(
          'set-namestone-redirect',
          {
            body: {
              parentDomain: cleanDomain,
              subname: subdomainLabel,
              redirectType: "default",
            },
          }
        );
        
        if (redirectError || redirectData?.error || !redirectData?.cid || !redirectData?.contenthash) {
          lastRedirectError = redirectError || redirectData?.error || 'Missing CID or contenthash';
          console.error(`[mint-subdomain] Redirect attempt ${attempt} failed`);
          
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, attempt * 2000));
          }
          continue;
        }
        
        console.log('[mint-subdomain] ✅ Redirect set successfully');
        redirectSuccess = true;
        break;
        
      } catch (redirectErr: any) {
        lastRedirectError = redirectErr;
        console.error(`[mint-subdomain] Redirect attempt ${attempt} exception`);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        }
      }
    }
    
    if (!redirectSuccess) {
      console.error('[mint-subdomain] ⚠️ All redirect attempts failed');
    }

    return j({ 
      ok: true, 
      subdomain: fullName, 
      expiryDate: expiryDate.toISOString(),
      redirectSuccess
    });
  } catch (e: any) {
    console.error("[mint-subdomain] Fatal error:", e.message);
    return j({ ok: false, error: "An error occurred. Please try again." }, 500);
  }
});
