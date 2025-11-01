import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateInput, subdomainSchema, domainSchema, ethereumAddressSchema } from "../_shared/validation.ts";
import { toSafeError, ErrorCodes, errorResponse } from "../_shared/errors.ts";
import { verifyAuth, verifyWalletOwnership } from "../_shared/auth.ts";

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
    // Verify authentication
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated) {
      console.error('[mint-subdomain] Unauthorized:', authResult.error);
      return errorResponse(
        toSafeError(new Error('Unauthorized'), ErrorCodes.UNAUTHORIZED), 
        401
      );
    }

    const body = await req.json();
    const { subdomain, walletAddress, domain, registrationMonths, paymentMethod, paymentAmount, networkFee, txHash } = body;

    // Verify wallet ownership
    if (!verifyWalletOwnership(authResult, walletAddress)) {
      console.error('[mint-subdomain] Wallet mismatch:', {
        authenticated: authResult.walletAddress,
        requested: walletAddress
      });
      return errorResponse(
        toSafeError(new Error('Wallet address mismatch'), ErrorCodes.UNAUTHORIZED), 
        403
      );
    }

    console.log('[mint-subdomain] Request received from authenticated user:', authResult.walletAddress);

    // Validate inputs
    const subdomainValidation = validateInput(subdomainSchema, subdomain);
    if (!subdomainValidation.success) {
      return errorResponse(toSafeError(subdomainValidation.error, ErrorCodes.INVALID_INPUT), 400);
    }

    const domainValidation = validateInput(domainSchema, domain);
    if (!domainValidation.success) {
      return errorResponse(toSafeError(domainValidation.error, ErrorCodes.INVALID_INPUT), 400);
    }

    const addressValidation = validateInput(ethereumAddressSchema, walletAddress);
    if (!addressValidation.success) {
      return errorResponse(toSafeError(addressValidation.error, ErrorCodes.INVALID_INPUT), 400);
    }

    const monthsValidation = validateInput(z.number().int().min(1).max(60), registrationMonths || 12);
    if (!monthsValidation.success) {
      return errorResponse(toSafeError(monthsValidation.error, ErrorCodes.INVALID_INPUT), 400);
    }

    // Parse subdomain label and domain safely
    const subdomainLabel = subdomainValidation.data.split(".")[0].trim().toLowerCase();
    const cleanDomain = domainValidation.data.trim().toLowerCase();

    console.log(`[Mint] Parsed: label="${subdomainLabel}", domain="${cleanDomain}"`);

    // Fetch domain config and API key from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: domainConfig, error: configError } = await supabase
      .from("domain_configs")
      .select("*")
      .eq("domain_name", cleanDomain)
      .eq("status", "active")
      .maybeSingle();

    if (configError) {
      console.error("[Mint] Database error:", configError);
      return errorResponse(toSafeError(configError, ErrorCodes.DATABASE_ERROR), 500);
    }

    let namestoneApiKey: string | undefined;

    if (domainConfig) {
      console.log('[mint-subdomain] Domain config found');
      namestoneApiKey = Deno.env.get(domainConfig.api_key_secret_name);
    } else {
      console.log('[mint-subdomain] No domain config, using default API key');
      namestoneApiKey = Deno.env.get("NAMESTONE_API_KEY");
    }

    if (!namestoneApiKey) {
      console.error(`[Mint] No API key found for domain`);
      return errorResponse(toSafeError(new Error('Domain not configured'), ErrorCodes.DOMAIN_NOT_CONFIGURED), 500);
    }

    console.log(`[Mint] API key resolved`);

    // Calculate dates
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setMonth(expiryDate.getMonth() + monthsValidation.data);
    const gracePeriodEnd = new Date(expiryDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 90);

    // Call Namestone API
    const namestonePayload = {
      domain: cleanDomain,
      names: [
        {
          name: subdomainLabel,
          address: walletAddress.toLowerCase(),
          text_records: {
            registration_months: String(monthsValidation.data),
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

    if (!namestoneRes.ok) {
      const errorText = await namestoneRes.text();
      console.error(`[Namestone] Error: ${namestoneRes.status}`);
      
      if (namestoneRes.status === 401) {
        return errorResponse(toSafeError(new Error('Unauthorized'), ErrorCodes.UNAUTHORIZED), 401);
      }
      
      return errorResponse(toSafeError(new Error(`Namestone error: ${namestoneRes.status}`), ErrorCodes.EXTERNAL_API_ERROR), 500);
    }

    const namestoneData = await namestoneRes.json();
    console.log('[mint-subdomain] Namestone API success');

    console.log('[mint-subdomain] Recording mint in database');
    
    // Check for existing orphaned records
    const fullName = `${subdomainLabel}.${cleanDomain}`;
    const { data: existingRecord } = await supabase
      .from("minted_domains")
      .select("*")
      .eq("full_name", fullName)
      .eq("wallet_address", walletAddress.toLowerCase())
      .maybeSingle();

    if (existingRecord) {
      console.log('[mint-subdomain] Cleaning up orphaned entry');
      await supabase
        .from("minted_domains")
        .delete()
        .eq("full_name", fullName)
        .eq("wallet_address", walletAddress.toLowerCase());
    }
    
    // Record in minted_domains
    const { error: dbError } = await supabase.from("minted_domains").insert({
      full_name: fullName,
      subdomain: subdomainLabel,
      domain: cleanDomain,
      wallet_address: walletAddress.toLowerCase(),
      registration_months: monthsValidation.data,
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
      
      if (dbError.code === '23505') {
        return errorResponse(toSafeError(new Error('Domain already exists'), ErrorCodes.ALREADY_EXISTS), 409);
      }
      
      return errorResponse(toSafeError(dbError, ErrorCodes.DATABASE_ERROR), 500);
    }

    console.log('[mint-subdomain] Mint completed successfully');
    return j({ ok: true, subdomain: fullName, expiryDate: expiryDate.toISOString() });
  } catch (e: any) {
    return errorResponse(toSafeError(e, ErrorCodes.INTERNAL_ERROR), 500);
  }
});
