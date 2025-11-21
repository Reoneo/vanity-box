import React, { useState, useEffect } from 'react';
import { callEdge } from '@/lib/supaInvoke';
import smithCashAvatar from '@/assets/smith-cash-avatar.png';
import { VerificationBadge } from './VerificationBadge';
import { checkWorldIdVerification } from '@/utils/worldIdVerification';

interface DomainAvatarProps {
  domain: {
    name: string;
    domain: string;
  };
  walletAddress?: string;
  size?: 'small' | 'large';
}

export const DomainAvatar: React.FC<DomainAvatarProps> = ({ domain, walletAddress, size = 'small' }) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationChecked, setVerificationChecked] = useState(false);

  useEffect(() => {
    const fetchAvatar = async () => {
      try {
        setIsLoading(true);
        const fullName = `${domain.name}.${domain.domain}`;
        
        // Validate the handle before making the API call
        if (!domain.name || !domain.domain || !fullName.includes('.')) {
          console.warn('Invalid domain format, skipping avatar fetch:', { domain, fullName });
          setIsLoading(false);
          return;
        }
        
        // Fetch ENS avatar from Web3.bio API
        const profile = await callEdge<any>('get-web3bio-profile', { handle: fullName });
        
        const first = Array.isArray(profile) ? profile[0] : (profile?.identity || profile);
        if (first?.avatar) {
          let avatarUrl = first.avatar as string;
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

  // Check World ID verification status
  useEffect(() => {
    const checkVerification = async () => {
      if (walletAddress && !verificationChecked) {
        const verified = await checkWorldIdVerification(walletAddress);
        setIsVerified(verified);
        setVerificationChecked(true);
      }
    };

    checkVerification();
  }, [walletAddress, verificationChecked]);

  const sizeClasses = size === 'large' 
    ? 'w-48 h-48 sm:w-64 sm:h-64 border-4' 
    : 'w-20 h-20 border-2';

  return (
    <div className={`relative flex items-center justify-center rounded-full border-[#D4AF37] overflow-hidden bg-black/30 backdrop-blur-sm shadow-[0_0_30px_rgba(212,175,55,0.6)] ${sizeClasses}`}>
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
      {walletAddress && verificationChecked && (
        <VerificationBadge isVerified={isVerified} size={size} />
      )}
    </div>
  );
};
