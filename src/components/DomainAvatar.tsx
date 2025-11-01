import React, { useState, useEffect } from 'react';
import { callEdge } from '@/lib/supaInvoke';
import smithCashAvatar from '@/assets/smith-cash-avatar.png';

interface DomainAvatarProps {
  domain: {
    name: string;
    domain: string;
  };
}

export const DomainAvatar: React.FC<DomainAvatarProps> = ({ domain }) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAvatar = async () => {
      try {
        setIsLoading(true);
        const fullName = `${domain.name}.${domain.domain}`;
        
        // Fetch ENS avatar from Web3.bio API
        const profile = await callEdge<any>('get-web3bio-profile', { handle: fullName });
        
        if (profile?.identity?.avatar) {
          let avatarUrl = profile.identity.avatar;
          
          // Convert IPFS URLs to HTTP gateway URLs
          if (avatarUrl.startsWith('ipfs://')) {
            avatarUrl = avatarUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
          } else if (avatarUrl.startsWith('ipns://')) {
            avatarUrl = avatarUrl.replace('ipns://', 'https://ipfs.io/ipns/');
          }
          
          setAvatarUrl(avatarUrl);
        }
      } catch (error) {
        console.error(`Error fetching avatar for ${domain.name}.${domain.domain}:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvatar();
  }, [domain.name, domain.domain]);

  return (
    <div className="w-20 h-20 flex items-center justify-center rounded-full border-2 border-[#D4AF37] overflow-hidden bg-black/30 backdrop-blur-sm">
      {isLoading ? (
        <div className="w-full h-full bg-gray-700 animate-pulse" />
      ) : (
        <img
          src={avatarUrl || smithCashAvatar}
          alt={`${domain.name}.${domain.domain}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to default avatar if ENS avatar fails to load
            (e.target as HTMLImageElement).src = smithCashAvatar;
          }}
        />
      )}
    </div>
  );
};
