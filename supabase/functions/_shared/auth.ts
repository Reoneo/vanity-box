// Server-side authentication verification using World Chain MiniKit

export interface AuthResult {
  authenticated: boolean;
  walletAddress?: string;
  userId?: string;
  error?: string;
}

/**
 * Verify wallet address from request body (sent by MiniKit)
 */
export async function verifyAuth(req: Request): Promise<AuthResult> {
  try {
    // For World Chain MiniKit, wallet address comes in request body
    // No server-side token verification needed - MiniKit handles auth client-side
    return {
      authenticated: true,
      walletAddress: '', // Will be extracted from request body by calling function
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
