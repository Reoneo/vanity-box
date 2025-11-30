import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Deployment timestamp for cache-busting: 2025-01-11T23:15:00Z
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
    console.log('[mint-subdomain] Request method:', req.method);
    console.log('[mint-subdomain] Request headers:', Object.fromEntries(req.headers.entries()));
    
    const rawBody = await req.text();
    console.log('[mint-subdomain] Raw request body:', rawBody);
    
    if (!rawBody || rawBody.trim() === '') {
      console.error('[mint-subdomain] Empty request body received');
      return j({ ok: false, error: "Empty request body" }, 400);
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('[mint-subdomain] JSON parse error:', parseError);
      return j({ ok: false, error: "Invalid JSON in request body" }, 400);
    }
    const { subdomain, walletAddress, domain, registrationMonths, paymentMethod, paymentAmount, networkFee, txHash } = body;

    console.log('[mint-subdomain] Request received:', { 
      subdomain, 
      domain, 
      walletAddress, 
      registrationMonths, 
      paymentMethod,
      paymentAmount,
      txHash,
      timestamp: new Date().toISOString()
    });

    if (!subdomain || !walletAddress || !domain) {
      console.error("[Mint] Missing required fields:", { subdomain, walletAddress, domain });
      return j({ ok: false, error: "Missing required fields" }, 400);
    }

    // Parse subdomain label and domain safely - PRESERVE $ in domain names
    const subdomainLabel = String(subdomain).split(".")[0].trim().toLowerCase();
    const cleanDomain = String(domain).trim().toLowerCase(); // DO NOT strip $ - it's part of the domain name!

    console.log(`[Mint] Parsed: label="${subdomainLabel}", domain="${cleanDomain}"`);

    // Validate subdomain label format (ENS-safe)
    if (!/^[a-z0-9-]{1,63}$/.test(subdomainLabel)) {
      console.error("[Mint] Invalid subdomain label format:", subdomainLabel);
      return j({ ok: false, error: "Invalid subdomain format. Use only lowercase letters, numbers, and hyphens." }, 400);
    }

    if (!cleanDomain || cleanDomain.length === 0) {
      console.error("[Mint] Domain is empty after processing");
      return j({ ok: false, error: "Invalid domain format" }, 400);
    }

    // Fetch domain config and API key from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[Mint] Fetching domain config for: ${cleanDomain}`);
    
    const { data: domainConfig, error: configError } = await supabase
      .from("domain_configs")
      .select("*")
      .eq("domain_name", cleanDomain)
      .eq("status", "active")
      .maybeSingle();

    if (configError) {
      console.error("[Mint] Error fetching domain config:", configError);
      return j({ ok: false, error: `Database error: ${configError.message}` }, 500);
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
      console.error(`[Mint] No API key found for domain: ${cleanDomain}`);
      return j({ ok: false, error: `Domain ${cleanDomain} is not configured. Please contact support.` }, 500);
    }

    console.log(`[Mint] API key resolved for ${cleanDomain}`);

    // Calculate dates
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setMonth(expiryDate.getMonth() + (registrationMonths || 12));
    const gracePeriodEnd = new Date(expiryDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 90);

    // Call Namestone set-names API (official endpoint)
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

    console.log('[mint-subdomain] Calling Namestone API:', {
      endpoint: 'set-names',
      subdomain: subdomainLabel,
      domain: cleanDomain,
      walletAddress
    });
    const namestoneRes = await fetch("https://namestone.com/api/public_v1/set-names", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": namestoneApiKey,
      },
      body: JSON.stringify(namestonePayload),
    });

    console.log(`[Namestone] Response status: ${namestoneRes.status}`);

    if (!namestoneRes.ok) {
      const errorText = await namestoneRes.text();
      console.error(`[Namestone] Error: ${namestoneRes.status} - ${errorText}`);
      
      // Provide clearer error for 401 (authorization issues)
      if (namestoneRes.status === 401) {
        return j({ 
          ok: false, 
          error: `API key not authorized for domain "${cleanDomain}". Please verify domain configuration.` 
        }, 500);
      }
      
      return j({ ok: false, error: `Namestone API error: ${errorText}` }, 500);
    }

    const namestoneData = await namestoneRes.json();
    console.log('[mint-subdomain] Namestone API success:', namestoneData);

    console.log('[mint-subdomain] Recording mint in database');
    
    // Check for existing orphaned records (in DB but not in Namestone)
    const fullName = `${subdomainLabel}.${cleanDomain}`;
    const { data: existingRecord } = await supabase
      .from("minted_domains")
      .select("*")
      .eq("full_name", fullName)
      .eq("wallet_address", walletAddress.toLowerCase())
      .maybeSingle();

    if (existingRecord) {
      console.log('[mint-subdomain] Found existing record, cleaning up orphaned entry');
      const { error: deleteError } = await supabase
        .from("minted_domains")
        .delete()
        .eq("full_name", fullName)
        .eq("wallet_address", walletAddress.toLowerCase());

      if (deleteError) {
        console.error('[mint-subdomain] Error cleaning up orphaned record:', deleteError);
      }
    }
    
    // Record in minted_domains
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
      tx_hash: txHash || `free-mint-${Date.now()}`,
    });

    if (dbError) {
      console.error("[DB] Error:", dbError);
      
      // Provide helpful error message for duplicate key errors
      if (dbError.code === '23505') {
        return j({ 
          ok: false, 
          error: `This domain "${fullName}" is already registered to this wallet. If you deleted it from Namestone but still see this error, please try again in a moment.` 
        }, 409);
      }
      
      return j({ ok: false, error: `Database error: ${dbError.message}` }, 500);
    }

    console.log('[mint-subdomain] Mint completed successfully:', {
      fullName: `${subdomainLabel}.${cleanDomain}`,
      expiryDate: expiryDate.toISOString()
    });

    // Set default redirect using Supabase client (BLOCKING with retries)
    console.log('[mint-subdomain] Setting default redirect...');
    
    let redirectSuccess = false;
    let lastRedirectError = null;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[mint-subdomain] Redirect attempt ${attempt}/${maxRetries}...`);
        
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
        
        if (redirectError) {
          lastRedirectError = redirectError;
          console.error(`[mint-subdomain] ❌ Redirect attempt ${attempt} FAILED:`, {
            error: redirectError,
            domain: `${subdomainLabel}.${cleanDomain}`,
            timestamp: new Date().toISOString()
          });
          
          // Wait before retry (exponential backoff)
          if (attempt < maxRetries) {
            const waitTime = attempt * 2000;
            console.log(`[mint-subdomain] Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
          continue;
        }
        
        if (redirectData?.error) {
          lastRedirectError = redirectData.error;
          console.error(`[mint-subdomain] ❌ Redirect attempt ${attempt} returned error:`, {
            error: redirectData.error,
            domain: `${subdomainLabel}.${cleanDomain}`,
            timestamp: new Date().toISOString()
          });
          
          // Wait before retry
          if (attempt < maxRetries) {
            const waitTime = attempt * 2000;
            console.log(`[mint-subdomain] Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
          continue;
        }
        
        // Verify we got a CID and contenthash
        if (!redirectData?.cid || !redirectData?.contenthash) {
          lastRedirectError = 'Missing CID or contenthash in response';
          console.error(`[mint-subdomain] ❌ Redirect attempt ${attempt} incomplete:`, {
            data: redirectData,
            domain: `${subdomainLabel}.${cleanDomain}`,
            timestamp: new Date().toISOString()
          });
          
          if (attempt < maxRetries) {
            const waitTime = attempt * 2000;
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
          continue;
        }
        
        // Success!
        console.log('[mint-subdomain] ✅ Redirect set successfully:', {
          domain: `${subdomainLabel}.${cleanDomain}`,
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
        console.error(`[mint-subdomain] ❌ Redirect attempt ${attempt} exception:`, {
          error: redirectErr,
          message: redirectErr?.message,
          domain: `${subdomainLabel}.${cleanDomain}`,
          timestamp: new Date().toISOString()
        });
        
        if (attempt < maxRetries) {
          const waitTime = attempt * 2000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    if (!redirectSuccess) {
      console.error('[mint-subdomain] ⚠️ All redirect attempts failed, but mint succeeded:', {
        domain: `${subdomainLabel}.${cleanDomain}`,
        lastError: lastRedirectError,
        timestamp: new Date().toISOString()
      });
    }

    return j({ 
      ok: true, 
      subdomain: `${subdomainLabel}.${cleanDomain}`, 
      expiryDate: expiryDate.toISOString(),
      redirectSuccess,
      redirectError: !redirectSuccess ? String(lastRedirectError) : undefined
    });
  } catch (e: any) {
    console.error("[Mint] Fatal:", e);
    return j({ ok: false, error: String(e?.message || e) }, 500);
  }
});
