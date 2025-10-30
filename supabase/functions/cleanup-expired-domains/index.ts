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

    // Initialize Supabase client
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.57.4');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all expired domains from database (where grace_period_end has passed)
    console.log('📋 Querying database for expired domains...');
    const { data: expiredDomains, error: queryError } = await supabase
      .from('minted_domains')
      .select('*')
      .lt('grace_period_end', now)
      .eq('is_expired', false);

    if (queryError) {
      console.error('❌ Database query error:', queryError);
      throw queryError;
    }

    console.log(`📊 Found ${expiredDomains?.length || 0} expired domains to clean up`);

    const deletedDomains: string[] = [];
    const errors: string[] = [];

    // Process each expired domain
    for (const domainRecord of expiredDomains || []) {
      const fullDomainName = `${domainRecord.subdomain}.${domainRecord.domain}`;
      console.log(`\n🔍 Processing expired domain: ${fullDomainName}`);
      console.log(`  📅 Grace period ended: ${domainRecord.grace_period_end}`);

      try {
        // Get API key for this domain
        const domainKey = domainRecord.domain.toUpperCase().replace(/\./g, '_');
        const apiKey = Deno.env.get(`NAMESTONE_API_KEY_${domainKey}`) || Deno.env.get('NAMESTONE_API_KEY');
        
        if (!apiKey) {
          console.log(`  ⚠️ No API key found for ${domainRecord.domain}, skipping Namestone deletion`);
          errors.push(`No API key for ${domainRecord.domain}`);
          continue;
        }

        // Delete from Namestone API
        console.log(`  🗑️ Deleting from Namestone...`);
        const deleteResponse = await fetch(
          'https://namestone.com/api/public_v1/delete-name',
          {
            method: 'POST',
            headers: {
              'Authorization': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              domain: domainRecord.domain,
              name: domainRecord.subdomain,
            }),
          }
        );

        if (deleteResponse.ok) {
          console.log(`  ✅ Successfully deleted from Namestone`);
          
          // Mark as expired in database
          const { error: updateError } = await supabase
            .from('minted_domains')
            .update({ is_expired: true })
            .eq('id', domainRecord.id);

          if (updateError) {
            console.error(`  ⚠️ Failed to update database record:`, updateError);
            errors.push(`Failed to update DB for ${fullDomainName}: ${updateError.message}`);
          } else {
            console.log(`  ✅ Marked as expired in database`);
            deletedDomains.push(fullDomainName);
          }
        } else {
          const errorText = await deleteResponse.text();
          console.error(`  ❌ Failed to delete from Namestone:`, errorText);
          errors.push(`Failed to delete ${fullDomainName} from Namestone: ${errorText}`);
        }
      } catch (error) {
        console.error(`  ❌ Error processing ${fullDomainName}:`, error);
        errors.push(`Error processing ${fullDomainName}: ${error instanceof Error ? error.message : String(error)}`);
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
