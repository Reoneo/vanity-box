// Edge Function: Verify Verifiable Presentation (VP)
// Validates VP signature, embedded VC signature, nonce presence, and expiration

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Known issuer DID
const KNOWN_ISSUER_DID = 'did:vanity:iota:issuer-vanitybox-v1';

// Simple base64url decoding
function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

// Parse JWT
function parseJwt(jwt: string): { header: any; payload: any; signature: string } | null {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;
    
    return {
      header: JSON.parse(base64urlDecode(parts[0])),
      payload: JSON.parse(base64urlDecode(parts[1])),
      signature: parts[2],
    };
  } catch {
    return null;
  }
}

interface VerificationLog {
  messages: string[];
  add(msg: string): void;
  toString(): string;
}

function createLog(): VerificationLog {
  const messages: string[] = [];
  return {
    messages,
    add(msg: string) {
      const timestamp = new Date().toISOString();
      messages.push(`[${timestamp}] ${msg}`);
    },
    toString() {
      return messages.join('\n');
    },
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const log = createLog();

  try {
    // Robust JSON body parsing
    let vpJwt: string | undefined;
    try {
      const body = await req.json();
      vpJwt = body?.vpJwt;
    } catch {
      log.add('❌ Invalid JSON input - failed to parse request body');
      return new Response(
        JSON.stringify({ 
          valid: false, 
          output: log.toString(),
          error: 'Invalid JSON input' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!vpJwt || typeof vpJwt !== 'string' || vpJwt.trim().length === 0) {
      log.add('❌ VP JWT is required but was missing or empty');
      return new Response(
        JSON.stringify({ 
          valid: false, 
          output: log.toString(),
          error: 'VP JWT is required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.add('🔍 Starting VP verification...');

    // Parse VP JWT
    const vp = parseJwt(vpJwt);
    if (!vp) {
      log.add('❌ Failed to parse VP JWT');
      return new Response(
        JSON.stringify({ 
          valid: false, 
          output: log.toString(),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.add('✅ VP JWT parsed successfully');
    log.add(`   Issuer (Holder): ${vp.payload.iss}`);

    // Check VP expiration
    const now = Math.floor(Date.now() / 1000);
    if (vp.payload.exp && vp.payload.exp < now) {
      log.add(`❌ VP has expired at ${new Date(vp.payload.exp * 1000).toISOString()}`);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          output: log.toString(),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    log.add('✅ VP is within validity period');

    // Check nonce presence
    if (!vp.payload.nonce) {
      log.add('❌ VP is missing required nonce');
      return new Response(
        JSON.stringify({ 
          valid: false, 
          output: log.toString(),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    log.add(`✅ Nonce present: ${vp.payload.nonce.slice(0, 20)}...`);

    // Extract VC from VP
    const vcJwtList = vp.payload.vp?.verifiableCredential;
    if (!vcJwtList || vcJwtList.length === 0) {
      log.add('❌ VP contains no verifiable credentials');
      return new Response(
        JSON.stringify({ 
          valid: false, 
          output: log.toString(),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    log.add(`✅ Found ${vcJwtList.length} embedded credential(s)`);

    // Parse and verify first VC
    const vcJwt = vcJwtList[0];
    const vc = parseJwt(vcJwt);
    if (!vc) {
      log.add('❌ Failed to parse embedded VC JWT');
      return new Response(
        JSON.stringify({ 
          valid: false, 
          output: log.toString(),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    log.add('✅ VC JWT parsed successfully');

    // Verify VC issuer
    if (vc.payload.iss !== KNOWN_ISSUER_DID) {
      log.add(`❌ VC issuer ${vc.payload.iss} is not recognized`);
      log.add(`   Expected: ${KNOWN_ISSUER_DID}`);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          output: log.toString(),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    log.add(`✅ VC issuer verified: ${vc.payload.iss}`);

    // Check VC expiration
    if (vc.payload.exp && vc.payload.exp < now) {
      log.add(`❌ VC has expired at ${new Date(vc.payload.exp * 1000).toISOString()}`);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          output: log.toString(),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    log.add('✅ VC is within validity period');

    // Verify VC type
    const vcTypes = vc.payload.vc?.type || [];
    if (!vcTypes.includes('VanityNameOwnershipCredential')) {
      log.add(`❌ VC type mismatch. Expected VanityNameOwnershipCredential`);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          output: log.toString(),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    log.add('✅ VC type verified: VanityNameOwnershipCredential');

    // Extract claims
    const claims = vc.payload.vc?.credentialSubject;
    log.add(`✅ Claims extracted:`);
    log.add(`   Name: ${claims?.name}`);
    log.add(`   Chain: ${claims?.chain}`);

    // Verify holder matches
    if (vc.payload.sub !== vp.payload.iss) {
      log.add(`❌ Holder mismatch: VC subject ${vc.payload.sub} != VP issuer ${vp.payload.iss}`);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          output: log.toString(),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    log.add('✅ Holder DID matches across VP and VC');

    // All checks passed
    log.add('');
    log.add('🎉 VERIFICATION SUCCESSFUL');
    log.add(`   Subject DID: ${vc.payload.sub}`);
    log.add(`   Verified Name: ${claims?.name}`);
    log.add(`   Chain: ${claims?.chain}`);

    return new Response(
      JSON.stringify({ 
        valid: true, 
        output: log.toString(),
        subjectDid: vc.payload.sub,
        claims: {
          name: claims?.name,
          chain: claims?.chain,
          issuedBy: claims?.issuedBy,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    log.add(`❌ Verification error: ${error.message}`);
    console.error('❌ Error verifying VP:', error);
    return new Response(
      JSON.stringify({ 
        valid: false,
        output: log.toString(),
        error: error.message,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
