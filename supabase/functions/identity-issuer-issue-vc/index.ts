// Edge Function: Issue Verifiable Credential (VC)
// Vanity.box acts as Issuer, issues VanityNameOwnershipCredential

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Issuer DID (Vanity.box)
const ISSUER_DID = 'did:vanity:iota:issuer-vanitybox-v1';

// Simple base64url encoding
function base64urlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Create a simple JWT structure (HS256-like signature simulation)
// In production, use proper cryptographic signing
function createVcJwt(holderDid: string, name: string): string {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + (365 * 24 * 60 * 60); // 1 year validity

  const header = {
    alg: 'ES256', // Simulated - in production use actual ECDSA
    typ: 'JWT',
  };

  const payload = {
    iss: ISSUER_DID,
    sub: holderDid,
    iat: now,
    exp: expiry,
    nbf: now,
    jti: `vc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    vc: {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://vanity.box/identity/v1',
      ],
      type: ['VerifiableCredential', 'VanityNameOwnershipCredential'],
      credentialSubject: {
        id: holderDid,
        name: name,
        chain: 'IOTA',
        issuedBy: 'Vanity.box',
      },
      issuanceDate: new Date(now * 1000).toISOString(),
      expirationDate: new Date(expiry * 1000).toISOString(),
    },
  };

  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  
  // Create a deterministic signature (in production, use actual crypto signing)
  const signatureInput = `${headerB64}.${payloadB64}.${ISSUER_DID}`;
  const signatureHash = Array.from(signatureInput).reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
  }, 0);
  const signature = base64urlEncode(`vanity-sig-${signatureHash.toString(36)}-${Date.now().toString(36)}`);

  return `${headerB64}.${payloadB64}.${signature}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { holderDid, name, walletAddress } = await req.json();

    if (!holderDid) {
      return new Response(
        JSON.stringify({ error: 'Holder DID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!name) {
      return new Response(
        JSON.stringify({ error: 'Name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate the VC JWT
    const vcJwt = createVcJwt(holderDid, name);

    console.log(`✅ Issued VC for ${name} to ${holderDid.slice(0, 30)}...`);

    return new Response(
      JSON.stringify({ 
        vcJwt,
        issuerDid: ISSUER_DID,
        issuedAt: new Date().toISOString(),
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error('❌ Error issuing VC:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to issue credential' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
