import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ENS Subgraph endpoint
const ENS_SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/ensdomains/ens';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress } = await req.json();

    if (!walletAddress || typeof walletAddress !== 'string') {
      console.log('❌ No valid wallet address provided');
      return new Response(JSON.stringify({ 
        domains: [], 
        wrappedDomains: [],
        allDomains: [],
        error: 'No wallet address provided' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedAddress = walletAddress.toLowerCase();
    console.log('🔍 Fetching ENS domains for:', normalizedAddress);

    // Query both domains (owned) and wrappedDomains (wrapped v3)
    // Also query domains where this address is the resolver target
    const graphqlQuery = {
      query: `
        query GetUserDomains($address: String!) {
          domains(
            first: 100
            orderBy: createdAt
            orderDirection: desc
            where: { owner: $address }
          ) {
            id
            name
            labelName
            labelhash
            owner { id }
            createdAt
            expiryDate
          }
          wrappedDomains(
            first: 100
            orderBy: expiryDate
            orderDirection: desc
            where: { owner: $address }
          ) {
            id
            name
            expiryDate
            owner { id }
          }
          resolvedDomains: domains(
            first: 50
            orderBy: createdAt
            orderDirection: desc
            where: { resolvedAddress: $address }
          ) {
            id
            name
            labelName
            owner { id }
            createdAt
            expiryDate
          }
        }
      `,
      variables: {
        address: normalizedAddress,
      },
    };

    console.log('📤 Querying ENS subgraph...');

    const response = await fetch(ENS_SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(graphqlQuery),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ ENS Subgraph error:', response.status, errorText);
      throw new Error(`Subgraph error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ ENS Subgraph response received');

    const domains = data?.data?.domains || [];
    const wrappedDomains = data?.data?.wrappedDomains || [];
    const resolvedDomains = data?.data?.resolvedDomains || [];

    console.log(`📊 Found ${domains.length} owned domains, ${wrappedDomains.length} wrapped domains, ${resolvedDomains.length} resolved domains`);

    // Merge and deduplicate all domains
    const domainMap = new Map<string, any>();

    // Add owned domains
    domains.forEach((d: any) => {
      if (d.name && !d.name.startsWith('[')) {
        domainMap.set(d.name, {
          name: d.name,
          labelName: d.labelName,
          type: 'owned',
          createdAt: d.createdAt,
          expiryDate: d.expiryDate,
          owner: d.owner?.id,
        });
      }
    });

    // Add wrapped domains (these are v3 wrapped names)
    wrappedDomains.forEach((d: any) => {
      if (d.name && !d.name.startsWith('[')) {
        const existing = domainMap.get(d.name);
        domainMap.set(d.name, {
          ...existing,
          name: d.name,
          type: 'wrapped',
          expiryDate: d.expiryDate,
          owner: d.owner?.id,
        });
      }
    });

    // Add resolved domains (names pointing to this address)
    resolvedDomains.forEach((d: any) => {
      if (d.name && !d.name.startsWith('[')) {
        const existing = domainMap.get(d.name);
        if (!existing) {
          domainMap.set(d.name, {
            name: d.name,
            labelName: d.labelName,
            type: 'resolved',
            createdAt: d.createdAt,
            expiryDate: d.expiryDate,
            owner: d.owner?.id,
          });
        }
      }
    });

    const allDomains = Array.from(domainMap.values());
    console.log(`✅ Total unique domains: ${allDomains.length}`);

    // Format as NFT-like objects for consistency with other NFT categories
    const formattedDomains = allDomains.map((d: any) => ({
      identifier: d.name,
      name: d.name,
      collection: 'ENS Domains',
      image_url: `https://metadata.ens.domains/mainnet/avatar/${d.name}`,
      display_image_url: `https://metadata.ens.domains/mainnet/avatar/${d.name}`,
      type: d.type,
      expiryDate: d.expiryDate,
      createdAt: d.createdAt,
      chain: 'ethereum',
      isEnsDomain: true,
    }));

    return new Response(JSON.stringify({
      domains: formattedDomains,
      count: formattedDomains.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error fetching ENS domains:', error);
    return new Response(JSON.stringify({
      domains: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
