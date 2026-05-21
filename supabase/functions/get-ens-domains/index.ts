import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ENS Subgraph endpoints - try decentralized first, then hosted fallback
const ENS_SUBGRAPH_URLS = [
  'https://gateway.thegraph.com/api/subgraphs/id/5XqPmWe6gjyrJtFn9cLy237i4cWw2j9HcUJEXsP5qGtH',
  'https://api.thegraph.com/subgraphs/name/ensdomains/ens',
];

// Helper to delay between retries
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch with retry logic
async function fetchWithRetry(urls: string[], body: string, maxRetries = 2): Promise<Response> {
  let lastError: Error | null = null;
  
  for (const url of urls) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📤 Trying ENS subgraph (attempt ${attempt + 1}): ${url.substring(0, 50)}...`);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });

        // If rate limited, wait and retry
        if (response.status === 429) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
          console.log(`⏳ Rate limited, waiting ${waitTime}ms before retry...`);
          await delay(waitTime);
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Subgraph error (${response.status}):`, errorText);
          lastError = new Error(`Subgraph error: ${response.status}`);
          break; // Try next URL
        }

        return response;
      } catch (error) {
        console.error(`❌ Fetch error:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxRetries) {
          await delay(Math.pow(2, attempt) * 500);
        }
      }
    }
  }

  throw lastError || new Error('All subgraph endpoints failed');
}

// v2 — supports domainName single lookup
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { walletAddress, domainName } = body || {};

    // --- Single domain lookup by name (used to surface a searched .eth name) ---
    if (domainName && typeof domainName === 'string') {
      const name = domainName.toLowerCase().trim();
      console.log('🔍 Fetching single ENS domain by name:', name);
      const singleQuery = {
        query: `
          query GetDomainByName($name: String!) {
            domains(first: 1, where: { name: $name }) {
              id
              name
              labelName
              owner { id }
              registrant { id }
              wrappedOwner { id }
              resolvedAddress { id }
              resolver { address }
              createdAt
              expiryDate
            }
            registrations(first: 1, where: { domain_: { name: $name } }, orderBy: registrationDate, orderDirection: desc) {
              registrationDate
              expiryDate
              registrant { id }
            }
          }
        `,
        variables: { name },
      };
      try {
        const r = await fetchWithRetry(ENS_SUBGRAPH_URLS, JSON.stringify(singleQuery));
        const j = await r.json();
        const d = j?.data?.domains?.[0];
        const reg = j?.data?.registrations?.[0];
        if (!d) {
          return new Response(JSON.stringify({ domain: null }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const formatted = {
          identifier: d.name,
          name: d.name,
          collection: 'ENS Domains',
          image_url: `https://metadata.ens.domains/mainnet/avatar/${d.name}`,
          display_image_url: `https://metadata.ens.domains/mainnet/avatar/${d.name}`,
          type: d.wrappedOwner?.id ? 'wrapped' : 'owned',
          expiryDate: reg?.expiryDate || d.expiryDate,
          createdAt: reg?.registrationDate || d.createdAt,
          owner: d.wrappedOwner?.id || d.owner?.id,
          manager: d.owner?.id,
          registrant: reg?.registrant?.id || d.registrant?.id,
          resolvedAddress: d.resolvedAddress?.id,
          resolver: d.resolver?.address,
          chain: 'ethereum',
          isEnsDomain: true,
        };
        return new Response(JSON.stringify({ domain: formatted }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        console.error('Single domain fetch failed:', e);
        return new Response(JSON.stringify({ domain: null, error: String(e) }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

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

    const response = await fetchWithRetry(ENS_SUBGRAPH_URLS, JSON.stringify(graphqlQuery));
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
      status: 200, // Return 200 with empty data to avoid breaking UI
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
