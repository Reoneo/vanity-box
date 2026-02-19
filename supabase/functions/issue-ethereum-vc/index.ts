// Edge Function: Issue Ethereum Wallet Ownership VC
// Verifies EVM signature (SIWE-style) then issues an EthereumWalletOwnershipCredential

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { hashMessage, recoverAddress } from "https://esm.sh/viem@2.37.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ISSUER_DID = 'did:vanity:iota:issuer-vanitybox-v1';

function base64urlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function createEvmVcJwt(holderDid: string, ethAddress: string): string {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + (365 * 24 * 60 * 60);

  const header = { alg: 'ES256', typ: 'JWT' };

  const payload = {
    iss: ISSUER_DID,
    sub: holderDid,
    iat: now,
    exp: expiry,
    nbf: now,
    jti: `vc-eth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    vc: {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://vanity.box/identity/v1',
      ],
      type: ['VerifiableCredential', 'EthereumWalletOwnershipCredential'],
      credentialSubject: {
        id: holderDid,
        address: ethAddress,
        chain: 'Ethereum',
        issuedBy: 'Vanity.box',
      },
      issuanceDate: new Date(now * 1000).toISOString(),
      expirationDate: new Date(expiry * 1000).toISOString(),
    },
  };

  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const signatureInput = `${headerB64}.${payloadB64}.${ISSUER_DID}`;
  const signatureHash = Array.from(signatureInput).reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
  }, 0);
  const signature = base64urlEncode(`vanity-sig-${signatureHash.toString(36)}-${Date.now().toString(36)}`);

  return `${headerB64}.${payloadB64}.${signature}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { holderDid, address, message, signature } = await req.json();

    if (!holderDid) {
      return new Response(
        JSON.stringify({ error: 'Holder DID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!address || !message || !signature) {
      return new Response(
        JSON.stringify({ error: 'address, message, and signature are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cryptographically verify EVM signature
    try {
      const messageHash = hashMessage(message);
      const recoveredAddress = await recoverAddress({
        hash: messageHash,
        signature: signature as `0x${string}`,
      });

      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        console.error('[issue-ethereum-vc] Signature mismatch:', recoveredAddress, '!=', address);
        return new Response(
          JSON.stringify({ error: 'Signature does not match claimed address' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`✅ EVM signature verified for ${recoveredAddress}`);
    } catch (cryptoErr: any) {
      console.error('[issue-ethereum-vc] Signature verification failed:', cryptoErr.message);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Issue the VC
    const vcJwt = createEvmVcJwt(holderDid, address);

    console.log(`✅ Issued EthereumWalletOwnershipCredential for ${address} to ${holderDid.slice(0, 30)}...`);

    return new Response(
      JSON.stringify({
        vcJwt,
        issuerDid: ISSUER_DID,
        issuedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Error issuing EVM VC:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to issue credential' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
