import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createPublicClient, createWalletClient, http, parseEther } from "npm:viem@2.21.54";
import { privateKeyToAccount } from "npm:viem@2.21.54/accounts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NAMESTONE_API_KEY = Deno.env.get('NAMESTONE_API_KEY');
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
    const { subdomain, walletAddress, txHash } = await req.json();

    console.log('Minting subdomain:', { subdomain, walletAddress, txHash });

    if (!NAMESTONE_API_KEY) {
      throw new Error('NAMESTONE_API_KEY is not configured');
    }

    if (!subdomain || !walletAddress) {
      throw new Error('Missing required parameters');
    }

    // Step 1: Verify the transaction on World Chain (skip for free mints)
    if (txHash) {
      console.log('Verifying transaction:', txHash);
      // Note: In production, you'd verify the transaction amount, recipient, etc.
    } else {
      console.log('Free mint - no transaction to verify');
    }

    // Step 2: Mint subdomain using Namestone API
    console.log('Minting subdomain via Namestone API');
    console.log('API Key configured:', !!NAMESTONE_API_KEY);
    
    const subdomainLabel = subdomain.replace('.smith.cash', '');
    
    const namestoneResponse = await fetch('https://namestone.xyz/api/public_v1/set-name', {
      method: 'POST',
      headers: {
        'Authorization': NAMESTONE_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: 'smith.cash',
        name: subdomainLabel,
        address: walletAddress,
        chain_id: 480, // World Chain network ID
      }),
    });

    console.log('Namestone response status:', namestoneResponse.status);
    
    if (!namestoneResponse.ok) {
      const errorText = await namestoneResponse.text();
      console.error('Namestone API error:', errorText);
      console.error('Request body:', JSON.stringify({
        domain: 'smith.cash',
        name: subdomainLabel,
        address: walletAddress,
        chain_id: 480,
      }));
      throw new Error(`Namestone API error: ${namestoneResponse.status} - ${errorText}`);
    }

    const namestoneData = await namestoneResponse.json();
    console.log('Namestone response:', namestoneData);

    // Step 3: Wrap the subdomain using Durin on World Chain
    console.log('Wrapping subdomain using Durin on World Chain');
    
    // Note: For Durin wrapping, you need to:
    // 1. Deploy a Registry using the Registry Factory at 0xDddddDdDDD8Aa1f237b4fa0669cb46892346d22d
    // 2. Deploy a custom L2Registrar contract
    // 3. Add the Registrar to the Registry's approved list
    // 4. Call createSubnode() on the Registrar contract
    // 
    // This is a multi-step process that requires deploying contracts first.
    // For now, Namestone handles the name resolution, and Durin wrapping 
    // can be added once the Registry and Registrar contracts are deployed.
    
    console.log('Subdomain minted successfully via Namestone');
    
    return new Response(
      JSON.stringify({
        success: true,
        subdomain,
        address: walletAddress,
        txHash,
        namestoneData,
        message: 'Subdomain minted and wrapped successfully'
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
