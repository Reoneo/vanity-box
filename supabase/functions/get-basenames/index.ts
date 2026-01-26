import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Base Subgraph endpoint for Basenames (ENS on Base)
const BASE_SUBGRAPH_URL = 'https://api.studio.thegraph.com/query/68543/basenames/version/latest';

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
        count: 0,
        error: 'No wallet address provided' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedAddress = walletAddress.toLowerCase();
    console.log('🔍 Fetching Basenames for:', normalizedAddress);

    // Query domains owned and resolved by this address on Base
    const graphqlQuery = {
      query: `
        query GetUserBasenames($address: String!) {
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

    console.log('📤 Querying Base Subgraph for Basenames...');

    const response = await fetch(BASE_SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(graphqlQuery),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Base Subgraph error:', response.status, errorText);
      throw new Error(`Subgraph error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Base Subgraph response received');

    // Check for GraphQL errors
    if (data.errors) {
      console.error('❌ GraphQL errors:', data.errors);
      throw new Error(`GraphQL error: ${data.errors[0]?.message}`);
    }

    const domains = data?.data?.domains || [];
    const wrappedDomains = data?.data?.wrappedDomains || [];
    const resolvedDomains = data?.data?.resolvedDomains || [];

    console.log(`📊 Found ${domains.length} owned domains, ${wrappedDomains.length} wrapped domains, ${resolvedDomains.length} resolved domains`);

    // Merge and deduplicate all domains
    const domainMap = new Map<string, any>();

    // Add owned domains
    domains.forEach((d: any) => {
      if (d.name && !d.name.startsWith('[') && d.name.endsWith('.base.eth')) {
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

    // Add wrapped domains
    wrappedDomains.forEach((d: any) => {
      if (d.name && !d.name.startsWith('[') && d.name.endsWith('.base.eth')) {
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
      if (d.name && !d.name.startsWith('[') && d.name.endsWith('.base.eth')) {
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
    console.log(`✅ Total unique Basenames: ${allDomains.length}`);

    // Format as NFT-like objects for consistency with other NFT categories
    // Use the Base avatar service for .base.eth domains
    const formattedDomains = allDomains.map((d: any) => ({
      identifier: d.name,
      name: d.name,
      collection: 'Basenames',
      // Base uses similar ENS metadata service but on Base chain
      image_url: `https://www.base.org/api/basenames/${d.name}/avatar`,
      display_image_url: `https://www.base.org/api/basenames/${d.name}/avatar`,
      type: d.type,
      expiryDate: d.expiryDate,
      createdAt: d.createdAt,
      chain: 'base',
      isBasename: true,
    }));

    return new Response(JSON.stringify({
      domains: formattedDomains,
      count: formattedDomains.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error fetching Basenames:', error);
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
