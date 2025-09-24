import React, { useState, useEffect } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  walletAddress?: string;
  username?: string;
}

interface WalletConnectionProps {
  className?: string;
}

export const WalletConnection: React.FC<WalletConnectionProps> = ({ className }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if we're running in World App
    const isInWorldApp = MiniKit.isInstalled();
    
    if (isInWorldApp) {
      console.log('✅ Running in World App - MiniKit is available');
    } else {
      console.log('❌ Not running in World App - MiniKit is not available');
    }
  }, []);

  // Remove auto-connect - users must manually connect

  const handleConnect = async () => {
    if (!MiniKit.isInstalled()) {
      console.warn('MiniKit is not installed. This app should be opened in World App.');
      alert('This app requires World App. Please open it in World App to connect your wallet.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔄 Initiating wallet authentication with World App native UI...');
      
      // Use the official World App wallet auth that shows the native modal
      const { commandPayload, finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce: generateNonce(),
        requestId: 'vanity-box-auth-' + Date.now(),
        expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        notBefore: new Date(Date.now() - 60 * 1000), // 1 minute ago
        statement: 'Sign in to Vanity.₿ox'
      });

      console.log('📦 Wallet auth response:', { commandPayload, finalPayload });

      if (finalPayload?.status === 'success' && finalPayload.address) {
        const ensName = await getWorldChainENS(finalPayload.address);
        const userData = {
          walletAddress: finalPayload.address,
          username: ensName
        };
        setUser(userData);
        sessionStorage.removeItem('skipAutoAuth');
        
        // Dispatch event for Index component
        window.dispatchEvent(new CustomEvent('wallet-connected', { detail: userData }));
        
        console.log('✅ User authenticated successfully:', userData);
      } else {
        console.error('❌ Authentication failed:', { commandPayload, finalPayload });
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('❌ Error during wallet authentication:', error);
      alert('Failed to connect wallet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    setUser(null);
    // Prevent immediate auto-reconnect after manual disconnect (this session only)
    sessionStorage.setItem('skipAutoAuth', '1');
    
    // Dispatch event for Index component
    window.dispatchEvent(new CustomEvent('wallet-disconnected'));
  };

  const generateNonce = (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const getWorldChainENS = async (address: string): Promise<string | undefined> => {
    console.log('🔍 Fetching World ID ENS for address:', address);
    
    try {
      // Primary method: NameStone API for World ID domains
      const response = await fetch(`https://namestone.com/api/public_v1/get-names?address=${address.toLowerCase()}`);
      console.log('📡 NameStone API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 NameStone API full response:', data);
        
        if (data.names && Array.isArray(data.names) && data.names.length > 0) {
          console.log('✅ Found names array:', data.names);
          
          // Priority 1: Look for .world.id domains (World ID domains)
          const worldIdDomain = data.names.find((name: any) => {
            const domain = name.name || name.domain || name;
            return typeof domain === 'string' && domain.endsWith('.world.id');
          });
          
          if (worldIdDomain) {
            const domain = worldIdDomain.name || worldIdDomain.domain || worldIdDomain;
            console.log('🆔 Found .world.id domain:', domain);
            return domain;
          }
          
          // Priority 2: Look for primary domains
          const primaryDomain = data.names.find((name: any) => {
            return name.primary === true || name.isPrimary === true || name.is_primary === true;
          });
          
          if (primaryDomain) {
            const domain = primaryDomain.name || primaryDomain.domain || primaryDomain;
            console.log('⭐ Found primary domain:', domain);
            return domain;
          }
          
          // Priority 3: Look for .world domains
          const worldDomain = data.names.find((name: any) => {
            const domain = name.name || name.domain || name;
            return typeof domain === 'string' && domain.endsWith('.world');
          });
          
          if (worldDomain) {
            const domain = worldDomain.name || worldDomain.domain || worldDomain;
            console.log('🌍 Found .world domain:', domain);
            return domain;
          }
          
          // Priority 4: Return the first available name as fallback
          const firstName = data.names[0];
          const domain = firstName.name || firstName.domain || firstName;
          if (typeof domain === 'string' && domain.length > 0) {
            console.log('📝 Using first available name:', domain);
            return domain;
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to get ENS from NameStone:', error);
    }

    // Additional fallback: try NameStone get-domain endpoint
    try {
      const resp = await fetch(`https://namestone.com/api/public_v1/get-domain?address=${address}`);
      console.log('📡 NameStone get-domain status:', resp.status);
      if (resp.ok) {
        const domainData = await resp.json();
        console.log('📦 NameStone get-domain data:', domainData);
        const name = domainData?.domain?.name || domainData?.name;
        if (typeof name === 'string' && name.length > 0) {
          return name;
        }
      }
    } catch (e) {
      console.error('❌ Failed NameStone get-domain fallback:', e);
    }
    
    try {
      // Fallback: Try reverse ENS lookup for regular ENS
      console.log('🔄 Trying web3.bio fallback...');
      const response = await fetch(`https://api.web3.bio/profile/${address}`);
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Web3.bio data:', data);
        if (data.ens) {
          console.log('✅ Found ENS from web3.bio:', data.ens);
          return data.ens;
        }
      }
    } catch (error) {
      console.error('❌ Failed to get ENS from web3.bio:', error);
    }
    
    console.log('❌ No ENS name found for address:', address);
    return undefined;
  };

  const formatAddress = (address: string): string => {
    return address.slice(0, 6) + '...' + address.slice(-4);
  };

  if (!user) {
    return (
      <Button
        onClick={handleConnect}
        disabled={isLoading}
        variant="outline"
        size="sm"
        className={cn("h-10 bg-black text-white border-2 border-black hover:bg-gray-800 hover:border-gray-800 transition-all duration-300 font-semibold", className)}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
            Connecting...
          </>
        ) : (
          'Connect'
        )}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleDisconnect}
      variant="outline"
      size="sm"
      className={cn("h-10 px-4 bg-black text-white border-2 border-black hover:bg-gray-800 hover:border-gray-800 transition-all duration-300 font-semibold", className)}
    >
      <span className="font-bold text-white truncate max-w-40">
        {user.username || formatAddress(user.walletAddress || '')}
      </span>
    </Button>
  );
};