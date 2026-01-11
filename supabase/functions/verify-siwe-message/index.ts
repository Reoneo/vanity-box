import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { hashMessage, recoverAddress } from "https://esm.sh/viem@2.37.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Parse a SIWE message string to extract key fields
 */
function parseSiweMessage(message: string): {
  address?: string;
  nonce?: string;
  issuedAt?: string;
  expirationTime?: string;
  domain?: string;
  uri?: string;
} {
  const result: any = {};
  
  // Extract Ethereum address
  const addressMatch = message.match(/0x[a-fA-F0-9]{40}/);
  if (addressMatch) {
    result.address = addressMatch[0];
  }
  
  // Extract nonce
  const nonceMatch = message.match(/Nonce:\s*([^\n]+)/i);
  if (nonceMatch) {
    result.nonce = nonceMatch[1].trim();
  }
  
  // Extract issued at
  const issuedAtMatch = message.match(/Issued At:\s*([^\n]+)/i);
  if (issuedAtMatch) {
    result.issuedAt = issuedAtMatch[1].trim();
  }
  
  // Extract expiration time
  const expirationMatch = message.match(/Expiration Time:\s*([^\n]+)/i);
  if (expirationMatch) {
    result.expirationTime = expirationMatch[1].trim();
  }
  
  // Extract domain (first line typically contains domain)
  const domainMatch = message.match(/^([^\s]+)\s+wants you to sign in/);
  if (domainMatch) {
    result.domain = domainMatch[1];
  }
  
  // Extract URI
  const uriMatch = message.match(/URI:\s*([^\n]+)/i);
  if (uriMatch) {
    result.uri = uriMatch[1].trim();
  }
  
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if request has proper content type
    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Invalid request format' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Read body as text first, then parse
    const body = await req.text();
    if (!body || body.trim() === '') {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Invalid request format' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch (e) {
      console.error('[verify-siwe] JSON parse error');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Invalid request format' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, signature, nonce } = parsedBody;
    
    console.log('[verify-siwe] Verifying SIWE message');

    if (!message || !signature || !nonce) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Missing required fields' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse SIWE message to extract fields
    const parsedMessage = parseSiweMessage(message);
    
    if (!parsedMessage.address) {
      console.error('[verify-siwe] No address found in message');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Invalid message format' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the nonce in the message matches the expected nonce
    if (parsedMessage.nonce !== nonce) {
      console.error('[verify-siwe] Nonce mismatch');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Invalid nonce' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check expiration time if present
    if (parsedMessage.expirationTime) {
      const expiration = new Date(parsedMessage.expirationTime);
      if (expiration < new Date()) {
        console.error('[verify-siwe] Message expired');
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Message has expired' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // CRITICAL: Cryptographically verify the signature
    // Use viem's recoverAddress to verify the signature matches the claimed address
    try {
      const messageHash = hashMessage(message);
      const recoveredAddress = await recoverAddress({
        hash: messageHash,
        signature: signature as `0x${string}`,
      });

      // Compare addresses (case-insensitive)
      const claimedAddress = parsedMessage.address.toLowerCase();
      const verified = recoveredAddress.toLowerCase() === claimedAddress;

      if (!verified) {
        console.error('[verify-siwe] Signature verification failed - address mismatch');
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Invalid signature' 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('[verify-siwe] ✅ Signature verified successfully');

      return new Response(JSON.stringify({ 
        success: true, 
        address: recoveredAddress,
        verified: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (cryptoError: any) {
      console.error('[verify-siwe] Cryptographic verification error:', cryptoError.message);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Signature verification failed' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error: any) {
    console.error('[verify-siwe] Error:', error.message);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Verification failed. Please try again.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
