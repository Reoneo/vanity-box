import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createPublicClient, createWalletClient, http, parseEther } from "npm:viem@2.21.54";
import { privateKeyToAccount } from "npm:viem@2.21.54/accounts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API key will be fetched based on domain
const WORLD_CHAIN_RPC = 'https://worldchain-mainnet.g.alchemy.com/public';
const REGISTRY_FACTORY_ADDRESS = '0xDddddDdDDD8Aa1f237b4fa0669cb46892346d22d';

// Minimal ABI for L2Registry createSubnode function
const L2_REGISTRY_ABI = [
  {
    inputs: [
      { name: "label", type: "string" },
      { name: "owner", type: "address" },
      { name: "resolver", type: "address" },
      { name: "ttl", type: "uint64" }
    ],
    name: "createSubnode",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subdomain, walletAddress, txHash, domain, registrationMonths = 12, paymentMethod, paymentAmount, networkFee } = await req.json();

    console.log('==========================================');
    console.log('🚀 STARTING SUBDOMAIN MINTING PROCESS');
    console.log('==========================================');
    console.log('📝 Subdomain:', subdomain);
    console.log('👛 Wallet Address:', walletAddress);
    console.log('🔗 Transaction Hash:', txHash || 'N/A (Free Mint)');
    console.log('🌐 Domain:', domain);
    console.log('📅 Registration Months:', registrationMonths);
    console.log('💳 Payment Method:', paymentMethod || 'N/A');
    console.log('💰 Payment Amount:', paymentAmount || 'N/A');
    console.log('==========================================');

    if (!subdomain || !walletAddress || !domain) {
      throw new Error('Missing required parameters');
    }

    // Get API key for this domain using robust mapping:
    // 1) NAMESTONE_API_KEY_<LABEL> (e.g., 30315, TEAMXRP, MEXIPAY)
    // 2) NAMESTONE_API_KEY_<FULL_DOMAIN> (e.g., 30315_ETH)
    // 3) NAMESTONE_API_KEY (generic fallback)
    const effectiveDomain = (domain || '').toLowerCase();
    const label = effectiveDomain.split('.')[0] || '';
    const labelKey = label.replace(/[^a-z0-9]/gi, '').toUpperCase();
    const domainKey = effectiveDomain.toUpperCase().replace(/\./g, '_');

    const NAMESTONE_API_KEY =
      Deno.env.get(`NAMESTONE_API_KEY_${labelKey}`) ||
      Deno.env.get(`NAMESTONE_API_KEY_${domainKey}`) ||
      Deno.env.get('NAMESTONE_API_KEY');
    
    if (!NAMESTONE_API_KEY) {
      throw new Error(`API key not configured for domain ${effectiveDomain || domain}`);
    }
    
    console.log('🔑 Using API key for domain:', effectiveDomain, 'resolved secret for label:', labelKey);

    // Step 1: Verify the transaction on World Chain (skip for free mints)
    if (txHash) {
      console.log('\n✅ STEP 1: Transaction Verification');
      console.log('🔍 Verifying transaction:', txHash);
      // Note: In production, you'd verify the transaction amount, recipient, etc.
      console.log('⚠️ Note: Transaction verification is a placeholder - implement full verification in production');
    } else {
      console.log('\n✅ STEP 1: Free Mint (Skipping Transaction Verification)');
    }

    // Step 2: Mint subdomain using Namestone API
    console.log('\n✅ STEP 2: Minting via Namestone API');
    
    // Extract the subdomain label and domain from the full subdomain
    // e.g., "g.$mith.eth" -> label: "g", domain: "$mith.eth"
    const parts = subdomain.split('.');
    const subdomainLabel = parts[0];
    const domainFromSubdomain = parts.slice(1).join('.');
    
    console.log('📋 Full subdomain:', subdomain);
    console.log('🏷️  Subdomain label:', subdomainLabel);
    console.log('🌐 Domain from subdomain:', domainFromSubdomain);
    console.log('🔑 API Key configured:', !!NAMESTONE_API_KEY);
    
    // Calculate expiry date based on months
    const registrationDate = new Date();
    const expiryDate = new Date(registrationDate);
    expiryDate.setMonth(expiryDate.getMonth() + registrationMonths);
    
    // Calculate grace period end (expiry + 1 month)
    const gracePeriodEnd = new Date(expiryDate);
    gracePeriodEnd.setMonth(gracePeriodEnd.getMonth() + 1);
    
    // Convert World Chain ID (480) to coin_type per SLIP-44: 0x80000000 + 480 = 2147484128
    const worldChainCoinType = (2147483648 + 480).toString();
    
    const namestonePayload = {
      domain: (domain || domainFromSubdomain || 'smith.cash').toLowerCase(),
      name: subdomainLabel.toLowerCase(),
      address: walletAddress,
      coin_types: {
        [worldChainCoinType]: walletAddress, // World Chain address resolution
      },
      text_records: {
        "registration_months": registrationMonths.toString(),
        "expiry_date": expiryDate.toISOString(),
        "grace_period_end": gracePeriodEnd.toISOString(),
      }
    };
    
    console.log('📤 Sending request to Namestone with payload:', JSON.stringify(namestonePayload, null, 2));
    
    const namestoneResponse = await fetch('https://namestone.com/api/public_v1/set-name', {
      method: 'POST',
      headers: {
        'Authorization': NAMESTONE_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(namestonePayload),
    });

    console.log('📥 Namestone response status:', namestoneResponse.status);
    
    if (!namestoneResponse.ok) {
      const errorText = await namestoneResponse.text();
      console.error('❌ NAMESTONE API ERROR');
      console.error('Status:', namestoneResponse.status);
      console.error('Error message:', errorText);
      console.error('Request payload:', JSON.stringify(namestonePayload, null, 2));
      throw new Error(`Namestone API error: ${namestoneResponse.status} - ${errorText}`);
    }

    const namestoneData = await namestoneResponse.json();
    console.log('✅ Namestone response:', JSON.stringify(namestoneData, null, 2));
    console.log('✅ Subdomain registered successfully via Namestone');

    // Log the minted domain to the database
    console.log('\n✅ STEP 2.5: Logging minted domain to database');
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.57.4');
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: insertError } = await supabase
        .from('minted_domains')
        .insert({
          subdomain: subdomainLabel,
          domain: (domain || domainFromSubdomain || 'smith.cash').toLowerCase(),
          full_name: subdomain.toLowerCase(),
          wallet_address: walletAddress.toLowerCase(),
          registration_months: registrationMonths,
          registration_date: registrationDate.toISOString(),
          expiry_date: expiryDate.toISOString(),
          grace_period_end: gracePeriodEnd.toISOString(),
          is_expired: false,
          tx_hash: txHash || null,
          payment_method: paymentMethod || null,
          payment_amount: paymentAmount || null,
          network_fee: networkFee || null,
        });

      if (insertError) {
        console.error('❌ Failed to log minted domain:', insertError);
        // Don't fail the entire mint if logging fails
      } else {
        console.log('✅ Minted domain logged to database successfully');
      }
    } catch (dbError) {
      console.error('❌ Error logging to database:', dbError);
      // Don't fail the entire mint if logging fails
    }

    // Step 3: Wrap the subdomain using Durin on World Chain
    console.log('\n✅ STEP 3: Durin Wrapping on World Chain');
    
    let durinWrappingStatus = {
      success: false,
      error: null as string | null,
      message: 'Durin wrapping not yet implemented'
    };
    
    try {
      console.log('📦 Attempting to wrap subdomain using Durin...');
      
      // Note: For Durin wrapping, you need to:
      // 1. Deploy a Registry using the Registry Factory at 0xDddddDdDDD8Aa1f237b4fa0669cb46892346d22d
      // 2. Deploy a custom L2Registrar contract
      // 3. Add the Registrar to the Registry's approved list
      // 4. Call createSubnode() on the Registrar contract
      
      console.log('⚠️ Durin wrapping requires the following contracts to be deployed:');
      console.log('  1. Registry (via Registry Factory at', REGISTRY_FACTORY_ADDRESS + ')');
      console.log('  2. Custom L2Registrar contract');
      console.log('  3. Registrar must be added to Registry approved list');
      console.log('⚠️ These contracts are not yet deployed. Skipping wrapping for now.');
      console.log('📝 Namestone handles name resolution. Durin wrapping can be added later.');
      
      durinWrappingStatus = {
        success: false,
        error: 'Contracts not deployed',
        message: 'Durin wrapping infrastructure not yet deployed. Domain registered via Namestone only.'
      };
      
    } catch (durinError) {
      console.error('❌ DURIN WRAPPING ERROR');
      console.error('Error:', durinError instanceof Error ? durinError.message : String(durinError));
      console.error('Stack:', durinError instanceof Error ? durinError.stack : 'N/A');
      
      durinWrappingStatus = {
        success: false,
        error: durinError instanceof Error ? durinError.message : 'Unknown Durin error',
        message: 'Failed to wrap subdomain with Durin, but domain was registered via Namestone'
      };
    }
    
    console.log('\n==========================================');
    console.log('🎉 SUBDOMAIN MINTING COMPLETE');
    console.log('==========================================');
    console.log('✅ Namestone Registration: SUCCESS');
    console.log('📦 Durin Wrapping:', durinWrappingStatus.success ? 'SUCCESS' : 'PENDING/FAILED');
    if (durinWrappingStatus.error) {
      console.log('⚠️ Durin Error:', durinWrappingStatus.error);
    }
    console.log('==========================================');
    
    return new Response(
      JSON.stringify({
        success: true,
        subdomain,
        address: walletAddress,
        txHash,
        namestoneData,
        durinWrapping: durinWrappingStatus,
        registration_months: registrationMonths,
        expiry_date: namestonePayload.text_records.expiry_date,
        grace_period_end: namestonePayload.text_records.grace_period_end,
        message: durinWrappingStatus.success
          ? 'Subdomain minted and wrapped successfully'
          : 'Subdomain minted via Namestone (Durin wrapping pending)'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in mint-subdomain function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
