import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { callEdge } from '@/lib/supaInvoke';
import { toast } from '@/hooks/use-toast';

interface FarcasterAuthContextType {
  isAuthenticated: boolean;
  signerUuid: string | null;
  fid: number | null;
  worldIdHash: string | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
}

const FarcasterAuthContext = createContext<FarcasterAuthContextType | undefined>(undefined);

export const useFarcasterAuth = () => {
  const context = useContext(FarcasterAuthContext);
  if (!context) {
    throw new Error('useFarcasterAuth must be used within FarcasterAuthProvider');
  }
  return context;
};

interface FarcasterAuthProviderProps {
  children: ReactNode;
}

export const FarcasterAuthProvider: React.FC<FarcasterAuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [signerUuid, setSignerUuid] = useState<string | null>(null);
  const [fid, setFid] = useState<number | null>(null);
  const [worldIdHash, setWorldIdHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('farcaster_auth');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setIsAuthenticated(true);
        setSignerUuid(parsed.signerUuid);
        setFid(parsed.fid);
        setWorldIdHash(parsed.worldIdHash);
      } catch (e) {
        console.error('Failed to parse stored auth:', e);
      }
    }
  }, []);

  const login = async (providedFid?: number) => {
    setIsLoading(true);
    try {
      // Mock World ID verification for now (replace with actual MiniKit.commandsAsync.verify)
      // For demo purposes, generate a mock hash
      const mockWorldIdHash = `world_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // In production, you would do:
      // const verifyPayload = { action: 'farcaster-login', signal: '' };
      // const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload);
      // const worldIdHash = finalPayload.proof;

      let fidNumber: number;
      
      if (providedFid) {
        // Use the FID passed from the profile
        fidNumber = providedFid;
      } else {
        // Fallback: ask user for their FID
        const userFid = prompt('Enter your Farcaster ID (FID):');
        if (!userFid || isNaN(Number(userFid))) {
          throw new Error('Invalid FID');
        }
        fidNumber = Number(userFid);
      }

      // Check if signer exists
      const existingSigner = await callEdge('get-farcaster-signer', {
        worldIdHash: mockWorldIdHash
      });

      if (existingSigner?.signerUuid) {
        // Use existing signer
        setIsAuthenticated(true);
        setSignerUuid(existingSigner.signerUuid);
        setFid(existingSigner.fid);
        setWorldIdHash(mockWorldIdHash);

        localStorage.setItem('farcaster_auth', JSON.stringify({
          signerUuid: existingSigner.signerUuid,
          fid: existingSigner.fid,
          worldIdHash: mockWorldIdHash
        }));

        toast({
          title: "Logged in",
          description: "Welcome back! You can now interact with casts.",
        });
      } else {
        // Create new signer
        const signerData = await callEdge('create-farcaster-signer', {
          worldIdHash: mockWorldIdHash,
          fid: fidNumber
        });

        setIsAuthenticated(true);
        setSignerUuid(signerData.signerUuid);
        setFid(signerData.fid);
        setWorldIdHash(mockWorldIdHash);

        localStorage.setItem('farcaster_auth', JSON.stringify({
          signerUuid: signerData.signerUuid,
          fid: signerData.fid,
          worldIdHash: mockWorldIdHash
        }));

        toast({
          title: "Logged in",
          description: "Signer created! You can now interact with casts.",
        });
      }
    } catch (error) {
      console.error('Login failed:', error);
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Failed to authenticate",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setSignerUuid(null);
    setFid(null);
    setWorldIdHash(null);
    localStorage.removeItem('farcaster_auth');
    toast({
      title: "Logged out",
      description: "You've been logged out of Farcaster.",
    });
  };

  return (
    <FarcasterAuthContext.Provider
      value={{
        isAuthenticated,
        signerUuid,
        fid,
        worldIdHash,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </FarcasterAuthContext.Provider>
  );
};
