// Edge Function: Create Verifiable Presentation (VP)
// Creates a VP JWT containing a VC with challenge nonce and expiration

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple base64url encoding
function base64urlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Create a VP JWT
function createVpJwt(
  holderDid: string, 
  vcJwt: string, 
  nonce: string, 
  expiresInSeconds: number
): string {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + expiresInSeconds;

  const header = {
    alg: 'ES256', // Simulated
    typ: 'JWT',
  };

  const payload = {
    iss: holderDid,
    aud: 'https://vanity.box/verifier',
    iat: now,
    exp: expiry,
    nbf: now,
    nonce: nonce,
    jti: `vp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    vp: {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://vanity.box/identity/v1',
      ],
      type: ['VerifiablePresentation'],
      verifiableCredential: [vcJwt],
      holder: holderDid,
    },
  };

  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  
  // Create signature
  const signatureInput = `${headerB64}.${payloadB64}.${holderDid}.${nonce}`;
  const signatureHash = Array.from(signatureInput).reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
  }, 0);
  const signature = base64urlEncode(`vp-sig-${signatureHash.toString(36)}-${Date.now().toString(36)}`);

  return `${headerB64}.${payloadB64}.${signature}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { holderDid, vcJwt, nonce, expiresInSeconds = 600 } = await req.json();

    if (!holderDid) {
      return new Response(
        JSON.stringify({ error: 'Holder DID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!vcJwt) {
      return new Response(
        JSON.stringify({ error: 'VC JWT is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!nonce) {
      return new Response(
        JSON.stringify({ error: 'Nonce is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate the VP JWT
    const vpJwt = createVpJwt(holderDid, vcJwt, nonce, expiresInSeconds);

    console.log(`✅ Created VP for ${holderDid.slice(0, 30)}... with nonce`);

    return new Response(
      JSON.stringify({ 
        vpJwt,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error('❌ Error creating VP:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create presentation' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
