// Server-side authentication verification using Privy
import { PrivyClient } from 'npm:@privy-io/server-auth@1';

const PRIVY_APP_ID = Deno.env.get('PRIVY_APP_ID') || '';
const PRIVY_APP_SECRET = Deno.env.get('PRIVY_APP_SECRET') || '';

let privyClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient {
  if (!privyClient) {
    if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
      throw new Error('Privy credentials not configured');
    }
    privyClient = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);
  }
  return privyClient;
}

export interface AuthResult {
  authenticated: boolean;
  walletAddress?: string;
  userId?: string;
  error?: string;
}

/**
 * Verify Privy authentication token from request headers
 */
export async function verifyAuth(req: Request): Promise<AuthResult> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authenticated: false, error: 'No authorization header' };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    const client = getPrivyClient();
    const claims = await client.verifyAuthToken(token);
    
    // Get wallet address from Privy user
    const user = await client.getUserById(claims.userId);
    const walletAddress = user.wallet?.address;

    if (!walletAddress) {
      return { authenticated: false, error: 'No wallet address found' };
    }

    return {
      authenticated: true,
      walletAddress: walletAddress.toLowerCase(),
      userId: claims.userId,
    };
  } catch (error) {
    console.error('Auth verification error:', error);
    return { 
      authenticated: false, 
      error: error instanceof Error ? error.message : 'Authentication failed' 
    };
  }
}

/**
 * Verify wallet ownership - checks if the provided wallet address matches the authenticated user
 */
export function verifyWalletOwnership(authResult: AuthResult, requestedWalletAddress: string): boolean {
  if (!authResult.authenticated || !authResult.walletAddress) {
    return false;
  }
  
  return authResult.walletAddress.toLowerCase() === requestedWalletAddress.toLowerCase();
}
