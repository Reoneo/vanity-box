import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('==========================================');
    console.log('🧹 STARTING EXPIRED DOMAINS CLEANUP');
    console.log('==========================================');

    const now = new Date().toISOString();
    console.log('📅 Current time:', now);

    // Get all domain API keys
    const domains = ['SMITH_CASH', '30315', 'TERMUX', 'TEAMXRP', 'SPYDA', 'FLIRTAD'];
    const deletedDomains: string[] = [];
    const errors: string[] = [];

    for (const domainKey of domains) {
      const apiKey = Deno.env.get(`NAMESTONE_API_KEY_${domainKey}`);
      if (!apiKey) {
        console.log(`⚠️ No API key found for ${domainKey}, skipping`);
        continue;
      }

      // Convert domain key to actual domain name
      const domainName = domainKey === 'SMITH_CASH' ? 'smith.cash' : 
                         domainKey === '30315' ? '30315.eth' :
                         domainKey === 'TERMUX' ? 'termux.eth' :
                         domainKey === 'TEAMXRP' ? 'teamxrp.eth' :
                         domainKey === 'SPYDA' ? 'spyda.eth' :
                         domainKey === 'FLIRTAD' ? 'flirtad.eth' : domainKey;

      console.log(`\n🔍 Checking domain: ${domainName}`);

      try {
        // Get all names for this domain using Namestone search API
        const searchResponse = await fetch(
          `https://namestone.com/api/public_v1/search-names?domain=${domainName}`,
          {
            headers: {
              'Authorization': apiKey,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!searchResponse.ok) {
          console.error(`❌ Failed to search names for ${domainName}:`, searchResponse.status);
          errors.push(`Failed to search ${domainName}: ${searchResponse.status}`);
          continue;
        }

        const searchData = await searchResponse.json();
        const names = searchData.names || [];

        console.log(`📋 Found ${names.length} names for ${domainName}`);

        // Check each name for expiry
        for (const nameData of names) {
          const metadata = nameData.metadata || {};
          const expiryDate = metadata.expiry_date;

          if (!expiryDate) {
            // No expiry date set, skip
            continue;
          }

          const expiry = new Date(expiryDate);
          const currentDate = new Date();

          console.log(`  📝 ${nameData.name}.${domainName} - Expiry: ${expiry.toISOString()}`);

          // Check if expired
          if (expiry < currentDate) {
            console.log(`  ⚠️ EXPIRED! Deleting ${nameData.name}.${domainName}`);

            // Delete the expired domain
            const deleteResponse = await fetch(
              'https://namestone.com/api/public_v1/delete-name',
              {
                method: 'POST',
                headers: {
                  'Authorization': apiKey,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  domain: domainName,
                  name: nameData.name,
                }),
              }
            );

            if (deleteResponse.ok) {
              console.log(`  ✅ Successfully deleted ${nameData.name}.${domainName}`);
              deletedDomains.push(`${nameData.name}.${domainName}`);
            } else {
              const errorText = await deleteResponse.text();
              console.error(`  ❌ Failed to delete ${nameData.name}.${domainName}:`, errorText);
              errors.push(`Failed to delete ${nameData.name}.${domainName}: ${errorText}`);
            }
          } else {
            const daysUntilExpiry = Math.ceil((expiry.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
            console.log(`  ✓ Valid - expires in ${daysUntilExpiry} days`);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing ${domainName}:`, error);
        errors.push(`Error processing ${domainName}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log('\n==========================================');
    console.log('🎉 CLEANUP COMPLETE');
    console.log(`✅ Deleted: ${deletedDomains.length} expired domains`);
    console.log(`❌ Errors: ${errors.length}`);
    console.log('==========================================');

    return new Response(
      JSON.stringify({
        success: true,
        deleted_count: deletedDomains.length,
        deleted_domains: deletedDomains,
        error_count: errors.length,
        errors: errors,
        timestamp: now,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Fatal error in cleanup-expired-domains:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
