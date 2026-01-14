import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

const TALENT_API_BASE = 'https://api.talentprotocol.com';

interface TalentSection {
  key: string;
  title: string;
  items: { key: string; label: string; value: string | number }[];
}

interface TalentResponse {
  profile: {
    displayName: string | null;
    avatarUrl: string | null;
    talentId: string | null;
    buildingUrl: string | null;
    openInTalentUrl: string;
    shareUrl: string;
  };
  scores: {
    builder: { value: number | null; levelLabel: string | null } | null;
    creator: { value: number | null; levelLabel: string | null } | null;
  };
  verification: {
    humanCheckmark: {
      isVerified: boolean;
      providers: string[];
    } | null;
  };
  sections: TalentSection[];
}

// Helper to format numbers with separators
function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

// Helper to format dates
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// Get score level label
function getScoreLevelLabel(score: number, scorerSlug: string): string {
  if (scorerSlug === 'builder_score') {
    if (score >= 100) return 'Titan';
    if (score >= 80) return 'Expert';
    if (score >= 60) return 'Practitioner';
    if (score >= 40) return 'Apprentice';
    if (score >= 20) return 'Novice';
    return 'Beginner';
  }
  // Creator score or other scores
  if (score >= 75) return 'Level 4';
  if (score >= 50) return 'Level 3';
  if (score >= 25) return 'Level 2';
  return 'Level 1';
}

// Group data points into sections
function groupCredentialsIntoSections(credentials: any[]): TalentSection[] {
  const sectionMap: Record<string, { title: string; items: { key: string; label: string; value: string | number }[] }> = {};
  
  const categoryToSection: Record<string, string> = {
    'Activity': 'onchain',
    'Developer': 'github',
    'Identity': 'talent_protocol',
    'Credibility': 'talent_protocol',
    'Humanity': 'talent_protocol',
    'Metrics': 'onchain',
    'Achievements': 'achievements',
    'Affiliations': 'affiliations',
    'Accounts': 'accounts',
  };
  
  const sectionTitles: Record<string, string> = {
    'talent_protocol': 'Talent Protocol',
    'github': 'GitHub',
    'onchain': 'Onchain Activity',
    'farcaster': 'Farcaster',
    'lens': 'Lens',
    'twitter': 'Twitter',
    'achievements': 'Achievements',
    'affiliations': 'Affiliations',
    'accounts': 'Accounts',
  };
  
  for (const cred of credentials) {
    // Skip null/empty values
    if (cred.readable_value === null || cred.readable_value === undefined || cred.readable_value === '') {
      continue;
    }
    
    // Determine section based on data_issuer_slug or category
    let sectionKey = 'other';
    const issuerSlug = cred.data_issuer_slug?.toLowerCase() || '';
    
    if (issuerSlug.includes('github')) {
      sectionKey = 'github';
    } else if (issuerSlug.includes('farcaster')) {
      sectionKey = 'farcaster';
    } else if (issuerSlug.includes('lens')) {
      sectionKey = 'lens';
    } else if (issuerSlug.includes('twitter') || issuerSlug.includes('x_')) {
      sectionKey = 'twitter';
    } else if (issuerSlug.includes('onchain') || issuerSlug.includes('transaction') || issuerSlug.includes('balance') || issuerSlug.includes('contract')) {
      sectionKey = 'onchain';
    } else if (issuerSlug.includes('talent') || cred.category === 'Identity' || cred.category === 'Credibility' || cred.category === 'Humanity') {
      sectionKey = 'talent_protocol';
    } else {
      sectionKey = categoryToSection[cred.category] || 'other';
    }
    
    if (!sectionMap[sectionKey]) {
      sectionMap[sectionKey] = {
        title: sectionTitles[sectionKey] || cred.data_issuer_name || 'Other',
        items: [],
      };
    }
    
    // Format value
    let value: string | number = cred.readable_value;
    if (typeof value === 'number') {
      value = formatNumber(value);
    } else if (typeof value === 'string') {
      // Check if it's a date
      if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
        value = formatDate(value);
      } else if (!isNaN(Number(value)) && value.trim() !== '') {
        value = formatNumber(Number(value));
      }
    }
    
    // Add UOM suffix if present
    if (cred.uom && typeof value === 'string') {
      value = `${value} ${cred.uom}`;
    }
    
    sectionMap[sectionKey].items.push({
      key: cred.slug || cred.name.toLowerCase().replace(/\s+/g, '_'),
      label: cred.name,
      value,
    });
  }
  
  // Convert to array and filter empty sections
  const sections: TalentSection[] = [];
  const sectionOrder = ['talent_protocol', 'github', 'onchain', 'farcaster', 'lens', 'twitter', 'achievements', 'affiliations', 'accounts', 'other'];
  
  for (const key of sectionOrder) {
    if (sectionMap[key] && sectionMap[key].items.length > 0) {
      sections.push({
        key,
        title: sectionMap[key].title,
        items: sectionMap[key].items,
      });
    }
  }
  
  // Add any sections not in the order
  for (const [key, section] of Object.entries(sectionMap)) {
    if (!sectionOrder.includes(key) && section.items.length > 0) {
      sections.push({
        key,
        title: section.title,
        items: section.items,
      });
    }
  }
  
  return sections;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body with fallback for empty/malformed JSON
    let wallet: string | undefined;
    let ens: string | undefined;
    let talentId: string | undefined;
    
    try {
      const body = await req.json();
      wallet = body?.wallet;
      ens = body?.ens;
      talentId = body?.talentId;
    } catch (parseError) {
      console.error('[TalentProtocol] Failed to parse request body:', parseError);
      return new Response(JSON.stringify({ 
        error: null,
        noData: true,
        profile: null,
        scores: null,
        verification: null,
        sections: [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('[TalentProtocol] Request received:', { wallet, ens, talentId });
    
    const apiKey = Deno.env.get('TALENT_PROTOCOL_API_KEY');
    if (!apiKey) {
      console.error('[TalentProtocol] API key not configured');
      throw new Error('Talent Protocol API key not configured');
    }
    
    // Resolve the best identifier - Talent Protocol API expects wallet address, not ENS names
    // Priority: wallet address > talentId (ENS names won't work with this API)
    let identifier: string | undefined;
    let accountSource: string | undefined;
    
    // Prioritize wallet address as the API works best with it
    if (wallet && wallet.startsWith('0x')) {
      identifier = wallet;
      accountSource = 'wallet';
    } else if (talentId) {
      // talentId can be used directly without account_source
      identifier = talentId;
    } else if (ens && ens.includes('.eth')) {
      // For .eth domains, try without account_source as the API might resolve it
      identifier = ens;
    }
    
    if (!identifier) {
      return new Response(JSON.stringify({ 
        error: 'No identifier provided',
        profile: null,
        scores: null,
        verification: null,
        sections: [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('[TalentProtocol] Using identifier:', identifier, 'source:', accountSource);
    
    const headers = {
      'X-API-KEY': apiKey,
      'Accept': 'application/json',
      'Cache-Control': 'no-store',
    };
    
    // Fetch profile data
    let profile: any = null;
    let builderScore: any = null;
    let creatorScore: any = null;
    let credentials: any[] = [];
    let humanCheckmarkData: any = null;
    
    // Build query params
    const baseParams = new URLSearchParams({ id: identifier });
    if (accountSource) {
      baseParams.set('account_source', accountSource);
    }
    
    // Fetch profile
    try {
      const profileUrl = `${TALENT_API_BASE}/profile?${baseParams.toString()}`;
      console.log('[TalentProtocol] Fetching profile:', profileUrl);
      const profileRes = await fetch(profileUrl, { headers });
      if (profileRes.ok) {
        profile = await profileRes.json();
        console.log('[TalentProtocol] Profile fetched:', JSON.stringify(profile).slice(0, 500));
      } else {
        console.log('[TalentProtocol] Profile fetch failed:', profileRes.status);
      }
    } catch (e) {
      console.error('[TalentProtocol] Profile fetch error:', e);
    }
    
    // Fetch Builder Score
    try {
      const builderParams = new URLSearchParams(baseParams);
      builderParams.set('scorer_slug', 'builder_score');
      const scoreUrl = `${TALENT_API_BASE}/score?${builderParams.toString()}`;
      console.log('[TalentProtocol] Fetching builder score:', scoreUrl);
      const scoreRes = await fetch(scoreUrl, { headers });
      if (scoreRes.ok) {
        builderScore = await scoreRes.json();
        console.log('[TalentProtocol] Builder score:', JSON.stringify(builderScore));
      }
    } catch (e) {
      console.error('[TalentProtocol] Builder score error:', e);
    }
    
    // Fetch Creator Score (if exists)
    try {
      const creatorParams = new URLSearchParams(baseParams);
      creatorParams.set('scorer_slug', 'creator_score');
      const scoreUrl = `${TALENT_API_BASE}/score?${creatorParams.toString()}`;
      const scoreRes = await fetch(scoreUrl, { headers });
      if (scoreRes.ok) {
        creatorScore = await scoreRes.json();
        console.log('[TalentProtocol] Creator score:', JSON.stringify(creatorScore));
      }
    } catch (e) {
      console.error('[TalentProtocol] Creator score error:', e);
    }
    
    // Fetch all credentials/data points
    try {
      const credUrl = `${TALENT_API_BASE}/credentials?${baseParams.toString()}`;
      console.log('[TalentProtocol] Fetching credentials:', credUrl);
      const credRes = await fetch(credUrl, { headers });
      if (credRes.ok) {
        const credData = await credRes.json();
        credentials = credData.credentials || [];
        console.log('[TalentProtocol] Credentials count:', credentials.length);
      }
    } catch (e) {
      console.error('[TalentProtocol] Credentials error:', e);
    }
    
    // Fetch human checkmark data
    try {
      const hcUrl = `${TALENT_API_BASE}/human_checkmark/data_points?${baseParams.toString()}`;
      console.log('[TalentProtocol] Fetching human checkmark:', hcUrl);
      const hcRes = await fetch(hcUrl, { headers });
      if (hcRes.ok) {
        humanCheckmarkData = await hcRes.json();
        console.log('[TalentProtocol] Human checkmark:', JSON.stringify(humanCheckmarkData));
      }
    } catch (e) {
      console.error('[TalentProtocol] Human checkmark error:', e);
    }
    
    // Check if we have any data at all
    if (!profile && !builderScore && !creatorScore && credentials.length === 0) {
      console.log('[TalentProtocol] No data found for identifier');
      return new Response(JSON.stringify({
        error: null,
        noData: true,
        profile: null,
        scores: null,
        verification: null,
        sections: [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Build normalized response
    const talentIdValue = profile?.profile?.id || profile?.id || talentId || null;
    const displayName = profile?.profile?.name || profile?.profile?.display_name || profile?.name || ens || null;
    
    const response: TalentResponse = {
      profile: {
        displayName,
        avatarUrl: profile?.profile?.image_url || profile?.image_url || null,
        talentId: talentIdValue,
        buildingUrl: profile?.profile?.tags?.includes('web3') ? 'https://Vanity.box' : null,
        openInTalentUrl: talentIdValue ? `https://app.talentprotocol.com/profile/${talentIdValue}` : `https://app.talentprotocol.com/search?q=${encodeURIComponent(identifier)}`,
        shareUrl: talentIdValue ? `https://app.talentprotocol.com/profile/${talentIdValue}` : '',
      },
      scores: {
        builder: builderScore?.score ? {
          value: builderScore.score.points,
          levelLabel: getScoreLevelLabel(builderScore.score.points, 'builder_score'),
        } : null,
        creator: creatorScore?.score ? {
          value: creatorScore.score.points,
          levelLabel: getScoreLevelLabel(creatorScore.score.points, 'creator_score'),
        } : null,
      },
      verification: {
        humanCheckmark: null,
      },
      sections: groupCredentialsIntoSections(credentials),
    };
    
    // Process human checkmark if present
    if (humanCheckmarkData?.data_points && humanCheckmarkData.data_points.length > 0) {
      const providers: string[] = [];
      for (const dp of humanCheckmarkData.data_points) {
        if (dp.name && dp.value === true) {
          providers.push(dp.name.replace('Verified by ', '').replace(' verification', ''));
        }
      }
      if (providers.length > 0) {
        response.verification.humanCheckmark = {
          isVerified: true,
          providers,
        };
      }
    } else if (profile?.profile?.human_checkmark) {
      response.verification.humanCheckmark = {
        isVerified: true,
        providers: [],
      };
    }
    
    console.log('[TalentProtocol] Response built successfully');
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('[TalentProtocol] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Unknown error',
      profile: null,
      scores: null,
      verification: null,
      sections: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
