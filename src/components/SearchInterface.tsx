import React, { useState, useEffect } from 'react';
import { Search, X, Filter, ChevronDown, ArrowLeft, Globe, ExternalLink, Copy, Mail, MapPin, Github, Send, Eye, Hourglass, Share2 } from 'lucide-react';
import { SiDiscord } from 'react-icons/si';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from 'next-themes';
import { SubdomainMintModal } from '@/components/SubdomainMintModal';
import { PersonalizedHeader } from '@/components/PersonalizedHeader';
import { UserDomainsDisplay } from '@/components/UserDomainsDisplay';
import { SpotifyPlayerModal } from '@/components/SpotifyPlayerModal';
import { MiniKit } from '@worldcoin/minikit-js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import ensLogoBlue from '@/assets/ens-logo-blue.png';
import ensLogoWhite from '@/assets/ens-logo-white.png';
import smithCashAvatar from '@/assets/smith-cash-avatar.png';
import smithBoxAvatar from '@/assets/smith-box-avatar.jpeg';
import vapeBoxAvatar from '@/assets/vape-box-avatar.webp';
import aptosLogo from '@/assets/aptos-logo.png';
import aptosNamesIcon from '@/assets/aptos-names-icon.jpeg';
import aptosNamesLight from '@/assets/aptos-names-light.png';
import aptosNamesNew from '@/assets/aptos-names-new.jpeg';
import avvyLogo from '@/assets/avvy-logo.png';
import smithAptAvatar from '@/assets/smith-apt-avatar.png';
import termuxAvatar from '@/assets/termux-avatar.png';
import mithEthAvatar from '@/assets/mith-eth-avatar.png';
import teamxrpAvatar from '@/assets/teamxrp-avatar.png';
import eth30315Avatar from '@/assets/30315-eth-avatar.png';
import ensV2Logo from '@/assets/ens-v2-logo.png';
import web3BioLogo from '@/assets/web3bio-logo.png';
import efpLogoFullDark from '@/assets/efp-logo-full-dark.png';
import spydaAvatar from '@/assets/spyda-avatar.jpeg';
import flirtadAvatar from '@/assets/flirtad-avatar.jpeg';
import prettyuglyAvatar from '@/assets/prettyugly-avatar.jpeg';
import sanAndreasAvatar from '@/assets/sanandreas-avatar.jpeg';
import guavapayAvatar from '@/assets/guavapay-avatar.png';
import mexipayAvatar from '@/assets/mexipay-avatar.png';
import { DynamicMetaTags } from '@/components/DynamicMetaTags';
import noResultsGif from '@/assets/no-results.gif';

export interface FilterState {
  protocol: string[];
  club: string[];
}

interface ENSResult {
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  category: string | string[];
  club: string | string[];
  spotifyUrl?: string;
  selectable?: boolean;
  enabled?: boolean;
}

interface Web3BioProfile {
  avatar?: string;
  displayName?: string;
  description?: string;
  address?: string;
  platform?: string;
  identity?: string;
  links?: any;
  header?: string;
  location?: string;
  email?: string;
}

interface EFPStats {
  followers_count?: number;
  following_count?: number;
}

interface EFPUser {
  address: string;
  ens?: { name?: string };
  web3bio?: Web3BioProfile;
}

interface EFPListResponse {
  followers?: EFPUser[];
  following?: EFPUser[];
}

interface ENSRecords {
  name?: string;
  address?: string;
  avatar?: string;
  records?: {
    [key: string]: string;
  };
}

export const SearchInterface = () => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const { username } = useParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [displayQuery, setDisplayQuery] = useState(''); // The actual searched query for display
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [showMintInterface, setShowMintInterface] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ENSResult | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ protocol: [], club: [] });
  const [ensResults, setEnsResults] = useState<ENSResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | undefined>(undefined);
  const [showMyIDs, setShowMyIDs] = useState(false);
  const [web3BioProfile, setWeb3BioProfile] = useState<Web3BioProfile | null>(null);
  const [efpStats, setEfpStats] = useState<EFPStats | null>(null);
  const [ensRecords, setEnsRecords] = useState<ENSRecords | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [userDomains, setUserDomains] = useState<string[]>([]);
  const [showFollowersList, setShowFollowersList] = useState(false);
  const [showFollowingList, setShowFollowingList] = useState(false);
  const [followersList, setFollowersList] = useState<EFPUser[]>([]);
  const [followingList, setFollowingList] = useState<EFPUser[]>([]);
  const [takenSubdomains, setTakenSubdomains] = useState<Set<string>>(new Set());
  const [followersPage, setFollowersPage] = useState(0);
  const [followingPage, setFollowingPage] = useState(0);
  const [totalFollowers, setTotalFollowers] = useState(0);
  const [totalFollowing, setTotalFollowing] = useState(0);
  const [followersSearchQuery, setFollowersSearchQuery] = useState('');
  const [followingSearchQuery, setFollowingSearchQuery] = useState('');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingEFP, setIsLoadingEFP] = useState(false);
  const [showSpotifyPlayer, setShowSpotifyPlayer] = useState(false);
  const [selectedSpotifyUrl, setSelectedSpotifyUrl] = useState('');
  const [selectedArtistName, setSelectedArtistName] = useState('');

  // Get wallet address from MiniKit
  useEffect(() => {
    const checkWallet = () => {
      const address = MiniKit.user?.walletAddress;
      setWalletAddress(address);
    };
    
    checkWallet();
    
    // Listen for wallet connection events
    const handleWalletChange = (event: CustomEvent) => {
      setWalletAddress(event.detail?.walletAddress);
    };
    
  const handleShowMyIDs = () => {
    setShowMyIDs(true);
    setShowMintInterface(false);
    window.dispatchEvent(new CustomEvent('show-my-ids'));
  };
    
    window.addEventListener('wallet-connected', handleWalletChange as EventListener);
    window.addEventListener('wallet-disconnected', () => {
      setWalletAddress(undefined);
      setShowMyIDs(false);
    });
    window.addEventListener('show-my-ids', handleShowMyIDs);
    
    return () => {
      window.removeEventListener('wallet-connected', handleWalletChange as EventListener);
      window.removeEventListener('wallet-disconnected', () => {
        setWalletAddress(undefined);
        setShowMyIDs(false);
      });
      window.removeEventListener('show-my-ids', handleShowMyIDs);
    };
  }, []);

  const protocols = ['Aptos Names', 'Avvy Domains', 'DNS', 'ENS', 'SNS.iD'];
  const clubs = ['Crypto', 'DeFi', 'Dev', 'Digits', 'Letters', 'Surname', 'Startup', 'Artist', 'Misc', 'Gaming'];

  // Auto-search when username is in URL
  useEffect(() => {
    if (username && !hasSearched) {
      setSearchQuery(username);
      // Trigger search after a short delay to ensure component is mounted
      setTimeout(() => {
        handleSearch(username);
      }, 100);
    }
  }, [username]);

  // Re-fetch results when language changes
  useEffect(() => {
    if (hasSearched && ensResults.length > 0) {
      const allResults = getAllResults();
      if (filters.protocol.length === 0 && filters.club.length === 0) {
        setEnsResults(allResults);
      } else {
        const filteredResults = allResults.filter(result => {
          const categories = Array.isArray(result.category) ? result.category : [result.category];
          const clubs = Array.isArray(result.club) ? result.club : [result.club];
          
          const protocolMatch = filters.protocol.length === 0 || 
            filters.protocol.some(p => categories.includes(p));
          const clubMatch = filters.club.length === 0 || 
            filters.club.some(c => clubs.includes(c));
          return protocolMatch && clubMatch;
        });
        setEnsResults(filteredResults);
      }
    }
  }, [language]);

  const getSubdomainPrice = (subdomain: string) => {
    const length = subdomain.length;
    if (length === 1) return 100;
    if (length === 2) return 50;
    if (length === 3) return 25;
    if (length === 4) return 15;
    if (length === 5) return 10;
    if (length >= 6 && length <= 9) return 5;
    return 1;
  };

  const handleProtocolToggle = (protocol: string) => {
    const newProtocols = filters.protocol.includes(protocol)
      ? filters.protocol.filter(p => p !== protocol)
      : [...filters.protocol, protocol];
    
    setFilters({
      ...filters,
      protocol: newProtocols
    });
  };

  const handleClubToggle = (club: string) => {
    const newClubs = filters.club.includes(club)
      ? filters.club.filter(c => c !== club)
      : [...filters.club, club];
    
    setFilters({
      ...filters,
      club: newClubs
    });
  };

  const handleClearFilters = () => {
    setFilters({ protocol: [], club: [] });
    setShowFilterDropdown(false);
    setEnsResults([]);
  };

  const handleApplyFilters = () => {
    if (filters.protocol.length > 0 || filters.club.length > 0) {
      handleSearch();
    }
    setShowFilterDropdown(false);
  };

  const getAllResults = () => {
    const allResults = [
      {
        name: 'Smith.cash',
        description: t('desc_smith_cash'),
        imageUrl: smithCashAvatar,
        price: 5,
        category: ['ENS', 'DNS'],
        club: ['Surname', 'DeFi']
      },
      {
        name: 'Smith.box',
        description: t('desc_smith_cash'),
        imageUrl: smithBoxAvatar,
        price: 5,
        category: ['ENS', 'DNS'],
        club: ['Surname', 'DeFi']
      },
      {
        name: 'Vape.box',
        description: t('desc_vape_box'),
        imageUrl: vapeBoxAvatar,
        price: 5,
        category: ['ENS', 'DNS'],
        club: ['Startup', 'DeFi']
      },
      {
        name: 'altcoin.chain',
        description: t('desc_altcoin_chain'),
        imageUrl: termuxAvatar,
        price: 5,
        category: ['ENS', 'DNS'],
        club: ['Crypto', 'DeFi']
      },
      {
        name: '30315.eth',
        description: t('desc_30315'),
        imageUrl: eth30315Avatar,
        price: 1,
        category: 'ENS',
        club: 'Digits',
        selectable: true,
        enabled: true
      },
      {
        name: 'MexiPay.eth',
        description: t('desc_mexipay'),
        imageUrl: mexipayAvatar,
        price: 5,
        category: 'ENS',
        club: 'DeFi',
        selectable: true,
        enabled: true
      },
      {
        name: 'GuavaPay.eth',
        description: t('desc_guavapay'),
        imageUrl: guavapayAvatar,
        price: 5,
        category: 'ENS',
        club: 'DeFi',
        selectable: true,
        enabled: true
      },
      {
        name: 'TeamXRP.eth',
        description: t('desc_teamxrp'),
        imageUrl: teamxrpAvatar,
        price: 5,
        category: 'ENS',
        club: 'Crypto',
        selectable: true,
        enabled: true
      },
      {
        name: '$mith.eth',
        description: t('desc_smith'),
        imageUrl: mithEthAvatar,
        price: 5,
        category: 'ENS',
        club: ['Surname', 'DeFi']
      },
      {
        name: 'smith.apt',
        description: t('desc_smith_apt'),
        imageUrl: smithAptAvatar,
        price: 5,
        category: 'Aptos Names',
        club: 'Surname'
      },
      {
        name: 'Termux.eth',
        description: t('desc_termux'),
        imageUrl: termuxAvatar,
        price: 5,
        category: 'ENS',
        club: 'Dev',
        selectable: true,
        enabled: true
      },
      {
        name: 'Spyda.eth',
        description: t('desc_spyda'),
        imageUrl: spydaAvatar,
        price: 5,
        category: 'ENS',
        club: 'Artist',
        spotifyUrl: 'https://open.spotify.com/track/4ZYYaXi1AnuBD5FfVLUqvX',
        selectable: true,
        enabled: true
      },
      {
        name: 'FlirtaD.eth',
        description: t('desc_flirtad'),
        imageUrl: flirtadAvatar,
        price: 5,
        category: 'ENS',
        club: 'Artist',
        spotifyUrl: 'https://open.spotify.com/track/3NGC2t1KnSOFcDQv8EI2Pl',
        selectable: true,
        enabled: true
      },
      {
        name: 'PrettyUgly.sol',
        description: t('desc_prettyugly'),
        imageUrl: prettyuglyAvatar,
        price: 5,
        category: 'SNS.iD',
        club: 'Misc',
        selectable: false,
        enabled: false
      },
      {
        name: 'SanAndreas.sol',
        description: t('desc_sanandreas'),
        imageUrl: sanAndreasAvatar,
        price: 5,
        category: 'SNS.iD',
        club: 'Gaming',
        selectable: false,
        enabled: false
      }
    ];
    return allResults;
  };

  const handleSearch = async (queryOverride?: string) => {
    const trimmedQuery = (queryOverride || searchQuery).trim();
    // Allow search to proceed if filters are applied, even without a query
    if (!trimmedQuery && filters.protocol.length === 0 && filters.club.length === 0) return;
    
    console.log('Search start', { query: trimmedQuery });
    setShowFilterDropdown(false);
    
    // Prevent searches with spaces
    if (trimmedQuery.includes(' ')) {
      return;
    }
    
    // Instantly clear previous results
    setEnsResults([]);
    setWeb3BioProfile(null);
    setEfpStats(null);
    setEnsRecords(null);
    
    // Update the display query to match what's being searched
    setDisplayQuery(trimmedQuery);
    
    setIsLoading(true);
    setHasSearched(true);
    setIsSearchActive(true);
    
    // Check if query is a wallet address (starts with 0x and 42 characters)
    const isWalletAddress = trimmedQuery && trimmedQuery.startsWith('0x') && trimmedQuery.length === 42;
    
    // If query contains a dot OR is a wallet address, fetch web3.bio profile
    if (trimmedQuery && (trimmedQuery.includes('.') || isWalletAddress)) {
      try {
        const { data, error } = await supabase.functions.invoke('get-web3bio-profile', {
          body: { handle: trimmedQuery }
        });
        
        if (error) throw error;
        
        if (data && !data.error && Array.isArray(data) && data.length > 0) {
          const profileData = data[0];
          setWeb3BioProfile(profileData);
          setEnsResults([]); // Clear ENS results when showing web3.bio profile
          
          // Fetch EFP stats and ENS records if we have an address or ENS name
          if (profileData.address || trimmedQuery.includes('.eth')) {
            const addressOrName = profileData.address || trimmedQuery;
            
            // Fetch EFP stats using the ethfollow.xyz API directly
            try {
              const efpResponse = await fetch(
                `https://api.ethfollow.xyz/api/v1/users/${addressOrName}/stats`
              );
              
              if (efpResponse.ok) {
                const efpData = await efpResponse.json();
                setEfpStats({
                  followers_count: parseInt(efpData.followers_count) || 0,
                  following_count: parseInt(efpData.following_count) || 0
                });
              }
            } catch (efpError) {
              console.error('Error fetching EFP stats:', efpError);
            }
            
            // Fetch ENS records
            try {
              const ensResponse = await fetch(
                `https://api.ethfollow.xyz/api/v1/users/${addressOrName}/ens`
              );
              
              if (ensResponse.ok) {
                const ensData = await ensResponse.json();
                if (ensData.ens) {
                  setEnsRecords(ensData.ens);
                }
              }
            } catch (ensError) {
              console.error('Error fetching ENS records:', ensError);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching web3.bio profile:', error);
      }
      setIsLoading(false);
      return;
    }
    
    // Fetch user's domains if wallet is connected
    if (walletAddress) {
      try {
        const { data: domainsData } = await supabase.functions.invoke('get-user-domains', {
          body: { walletAddress }
        });
        if (domainsData?.domains) {
          setUserDomains(domainsData.domains.map((d: any) => `${d.name}.${d.domain}`.toLowerCase()));
        }
      } catch (error) {
        console.error('Error fetching user domains:', error);
      }
    }
    
    // Check which subdomains are already taken on Namestone (only if there's a query)
    let allResults = getAllResults();
    if (trimmedQuery) {
      const checkPromises = allResults.map(async (result) => {
        // Only check Namestone domains (smith.cash, smith.box, vape.box, altcoin.chain, $mith.eth)
        if (result.name === 'Smith.cash' || result.name === 'Smith.box' || 
            result.name === 'Vape.box' || result.name === 'altcoin.chain' || 
            result.name === '$mith.eth') {
          const domain = result.name.toLowerCase();
          try {
            const { data } = await supabase.functions.invoke('check-namestone-subdomain', {
              body: { subdomain: trimmedQuery, domain }
            });
            if (data?.exists) {
              return domain;
            }
          } catch (error) {
            console.error(`Error checking ${domain}:`, error);
          }
        }
        return null;
      });
      
      const takenResults = await Promise.all(checkPromises);
      const taken = new Set(takenResults.filter(Boolean) as string[]);
      setTakenSubdomains(taken);
    } else {
      setTakenSubdomains(new Set());
    }
    
    await new Promise(resolve => setTimeout(resolve, 250));
    
    // Filter results
    let filteredResults = allResults;
    
    // Apply protocol and club filters if any are selected
    if (filters.protocol.length > 0 || filters.club.length > 0) {
      filteredResults = allResults.filter(result => {
        const categories = Array.isArray(result.category) ? result.category : [result.category];
        const clubs = Array.isArray(result.club) ? result.club : [result.club];
        
        const protocolMatch = filters.protocol.length === 0 || 
          filters.protocol.some(p => categories.includes(p));
        const clubMatch = filters.club.length === 0 || 
          filters.club.some(c => clubs.includes(c));
        return protocolMatch && clubMatch;
      });
    } else {
      // If no filters are applied, show all available subdomains
      filteredResults = allResults;
    }
    
    // Sort results: Selectable items first ("Select"), then coming soon items, then alphabetically
    filteredResults.sort((a, b) => {
      const aIsSelectable = (a as any).selectable === true || a.name === 'Smith.cash' || a.name === '$mith.eth';
      const bIsSelectable = (b as any).selectable === true || b.name === 'Smith.cash' || b.name === '$mith.eth';
      
      // If both selectable or both not, sort alphabetically
      if (aIsSelectable === bIsSelectable) {
        return a.name.localeCompare(b.name);
      }
      
      // Selectable items come first
      return aIsSelectable ? -1 : 1;
    });
    
    setEnsResults(filteredResults);
    console.log('Results set', filteredResults.length);
    
    if (searchQuery) {
      setIsAvailable(!searchQuery.toLowerCase().includes('taken'));
    }
    setIsLoading(false);
  };

  const handleMint = (result: ENSResult) => {
    setSelectedResult(result);
    setShowMintInterface(true);
  };

  const handleBackToResults = () => {
    setShowMintInterface(false);
    setSelectedResult(null);
  };

  const handleFlipCard = (index: number) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const searchResults = searchQuery && !isLoading && isAvailable !== null;
  const price = displayQuery ? getSubdomainPrice(displayQuery) : 0;
  const hasFilters = filters.protocol.length > 0 || filters.club.length > 0;
  const totalFilters = filters.protocol.length + filters.club.length;

  return (
    <>
      {showFilterDropdown && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" />
      )}
      
      <div className="w-full">
        {/* Show mint interface when a result is selected */}
        {showMintInterface && selectedResult ? (
          <SubdomainMintModal
            isOpen={true}
            onClose={handleBackToResults}
            subdomain={displayQuery ? `${displayQuery}.${selectedResult.name}` : selectedResult.name}
            price={price}
            resultAvatar={selectedResult.imageUrl}
            domain={selectedResult.name.toLowerCase().replace(/\s+/g, '')}
          />
        ) : (
          <>
            <DynamicMetaTags 
              username={web3BioProfile?.identity || displayQuery}
              displayName={web3BioProfile?.displayName}
              description={web3BioProfile?.description}
              avatar={web3BioProfile?.avatar}
              banner={web3BioProfile?.header}
            />
            {/* Main Heading - hidden only when web3.bio profile is displayed */}
            {!showMintInterface && !showMyIDs && !web3BioProfile && <PersonalizedHeader user={null} isProfileDisplayed={!!web3BioProfile} />}
            
            {/* My IDs Header with Back Button - shown when displaying IDs */}
            {!showMintInterface && showMyIDs && (
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setShowMyIDs(false);
                    window.dispatchEvent(new Event('back-to-domains'));
                  }}
                  className="flex items-center gap-2 text-gray-900 dark:text-white hover:text-[#D4AF37] dark:hover:text-[#D4AF37] transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="font-medium">{t('back')}</span>
                </button>
                <h1 className="text-3xl md:text-5xl font-bold text-center text-gray-900 dark:text-white whitespace-nowrap">
                  {t('my_ids')}
                </h1>
              </div>
            )}
            
            {/* Search bar container - hidden when showing My IDs */}
            {!showMyIDs && (
            <div className="w-full max-w-md mx-auto mb-4 md:mb-0 mt-4">
              <div className="relative">
                <div className="absolute left-1 top-1 z-10 flex items-center h-10">
                  <DropdownMenu open={showFilterDropdown} onOpenChange={setShowFilterDropdown}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black border-[#D4AF37] rounded-md flex items-center justify-center"
                      >
                        <Filter className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-80 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-[#D4AF37]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] p-4 z-50">
                      <div className="relative">
                        <div className="absolute -top-16 -right-16 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-3xl" />
                        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-[#D4AF37]/5 rounded-full blur-3xl" />
                        
                        <div className="relative z-10 space-y-4">
                          <DropdownMenuLabel className="text-lg font-semibold text-white">Filter</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-[#D4AF37]/30" />
                          
                          <div className="space-y-3">
                            <p className="text-sm font-medium text-gray-300">{t('protocol')}</p>
                            <div className="flex flex-wrap gap-2">
                              {protocols.map(protocol => (
                                <label
                                  key={protocol}
                                  className={cn(
                                    "px-4 py-2 rounded-full cursor-pointer transition-all duration-300 flex items-center gap-2 text-sm font-medium border-2",
                                    filters.protocol.includes(protocol)
                                      ? "bg-[#D4AF37] text-black border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.4)]"
                                      : "bg-gray-800/50 text-gray-300 border-gray-700 hover:border-[#D4AF37]/50 hover:bg-gray-700/50"
                                  )}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleProtocolToggle(protocol);
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={filters.protocol.includes(protocol)}
                                    onChange={() => handleProtocolToggle(protocol)}
                                  />
                                  {protocol}
                                </label>
                              ))}
                            </div>
                          </div>
                          
                          <DropdownMenuSeparator className="bg-[#D4AF37]/30" />
                          
                          <div className="space-y-3">
                            <p className="text-sm font-medium text-gray-300">{t('club')}</p>
                            <div className="flex flex-wrap gap-2">
                              {clubs.map(club => (
                                <label
                                  key={club}
                                  className={cn(
                                    "px-4 py-2 rounded-full cursor-pointer transition-all duration-300 flex items-center gap-2 text-sm font-medium border-2",
                                    filters.club.includes(club)
                                      ? "bg-[#D4AF37] text-black border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.4)]"
                                      : "bg-gray-800/50 text-gray-300 border-gray-700 hover:border-[#D4AF37]/50 hover:bg-gray-700/50"
                                  )}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleClubToggle(club);
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={filters.club.includes(club)}
                                    onChange={() => handleClubToggle(club)}
                                  />
                                  {club}
                                </label>
                              ))}
                            </div>
                          </div>
                          
                          <DropdownMenuSeparator className="bg-[#D4AF37]/30" />
                          
                           <div className="flex justify-between gap-3 pt-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={handleClearFilters}
                              className="flex-1 border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]"
                            >
                              Clear
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => {
                                handleApplyFilters();
                                setShowFilterDropdown(false);
                              }}
                              className="flex-1 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold"
                            >
                              Apply
                            </Button>
                          </div>
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Input
                  placeholder={t('search_for_a_name')}
                  className="h-12 text-sm text-center bg-white dark:bg-gray-900 border-[#D4AF37] focus:border-[#D4AF37] text-gray-900 dark:text-white placeholder-gray-900 dark:placeholder-white pl-20 pr-20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                      setIsSearchActive(true);
                    }
                  }}
                  onFocus={() => {
                    setIsSearchActive(true);
                    setShowFilterDropdown(false);
                  }}
                />
                <div className="absolute right-1 top-1 z-10 flex items-center gap-1 h-10">
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setEnsResults([]);
                        setIsAvailable(null);
                        setHasSearched(false);
                        setWeb3BioProfile(null);
                        setIsSearchActive(false);
                      }}
                      className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4 text-black dark:text-white" />
                    </button>
                  )}
                  <Button
                    onClick={() => handleSearch()}
                    size="sm"
                    className="h-8 px-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black"
                    disabled={!searchQuery.trim() || isLoading}
                  >
                    <Search className="w-4 h-4 text-black" />
                  </Button>
                </div>
              </div>
            </div>
            )}
            

            {/* Web3.bio Profile Result - Social Media Style - Only show when search is active */}
            {web3BioProfile && hasSearched && (
              <div className="w-full sm:max-w-3xl sm:mx-auto mt-8">
                <Card className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-[#D4AF37]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden">
                  {/* Header/Banner */}
                  <div className="relative h-32 sm:h-48 bg-gradient-to-r from-[#D4AF37]/20 via-[#F7E06C]/10 to-[#D4AF37]/20">
                    {web3BioProfile.header && (
                      <img 
                        src={web3BioProfile.header} 
                        alt="Profile header"
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900/60"></div>
                    
                    {/* Share Button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-4 right-4 h-10 w-10 p-0 bg-gray-900/60 hover:bg-gray-900/80 backdrop-blur-sm border border-[#D4AF37]/30"
                      onClick={async () => {
                        const shareUrl = `${window.location.origin}/${displayQuery || searchQuery}`;
                        const shareData = {
                          title: `${web3BioProfile.displayName || searchQuery} - Vanity.box`,
                          text: `Check out ${web3BioProfile.displayName || searchQuery}'s profile on Vanity.box`,
                          url: shareUrl,
                        };
                        
                        try {
                          if (navigator.share) {
                            await navigator.share(shareData);
                          } else {
                            await navigator.clipboard.writeText(shareUrl);
                            const event = new CustomEvent('show-toast', {
                              detail: {
                                title: 'Link Copied!',
                                description: 'Profile link copied to clipboard',
                              }
                            });
                            window.dispatchEvent(event);
                          }
                        } catch (err) {
                          console.error('Error sharing:', err);
                        }
                      }}
                    >
                      <Share2 className="h-4 w-4 text-[#D4AF37]" />
                    </Button>
                  </div>
                  
                   <CardContent className="relative -mt-16 sm:-mt-20 px-4 sm:px-6 pb-6 flex flex-col items-center">
                     {/* Avatar */}
                     <div className="relative inline-block mb-4">
                       <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37] to-[#F7E06C] rounded-full blur-xl opacity-60"></div>
                       <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-[#D4AF37] overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.6)] bg-gray-800">
                         {web3BioProfile.avatar ? (
                           <img 
                             src={web3BioProfile.avatar} 
                             alt={web3BioProfile.displayName || searchQuery}
                             className="w-full h-full object-cover"
                           />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-4xl text-white font-bold">
                             {(web3BioProfile.displayName || searchQuery).charAt(0).toUpperCase()}
                           </div>
                         )}
                       </div>
                     </div>
                     
                     {/* Profile Info - Centered */}
                     <div className="space-y-3 flex flex-col items-center text-center w-full">
                       <div className="flex flex-col items-center">
                         <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                           {web3BioProfile.displayName || searchQuery}
                         </h3>
                        {web3BioProfile.address && (
                           <div className="flex items-center gap-2 justify-center">
                             <p className="text-[#D4AF37] text-sm font-mono">
                               {web3BioProfile.address.slice(0, 6)}...{web3BioProfile.address.slice(-4)}
                             </p>
                             <Button
                               size="sm"
                               variant="ghost"
                               className="h-6 w-6 p-0 hover:bg-[#D4AF37]/20"
                               onClick={() => {
                                 navigator.clipboard.writeText(web3BioProfile.address);
                                 const event = new CustomEvent('show-toast', {
                                   detail: {
                                     title: 'Copied!',
                                     description: 'Wallet address copied to clipboard',
                                   }
                                 });
                                 window.dispatchEvent(event);
                               }}
                             >
                               <Copy className="h-3 w-3 text-[#D4AF37]" />
                             </Button>
                           </div>
                         )}
                       </div>
                      
                       {/* Bio/Description */}
                       {web3BioProfile.description && (
                         <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                           {web3BioProfile.description}
                         </p>
                       )}
                       
                        {/* Email, Website, and Location - Email first, then website, then location */}
                        <div className="flex flex-col gap-2 text-sm text-gray-400 items-center">
                          {(ensRecords?.records?.email || web3BioProfile.email) && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              <span>{ensRecords?.records?.email || web3BioProfile.email}</span>
                            </div>
                          )}
                          {(web3BioProfile.links?.website || ensRecords?.records?.url) && (
                            <a
                              href={web3BioProfile.links?.website?.link || ensRecords?.records?.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 hover:text-[#D4AF37] transition-colors"
                            >
                              <Globe className="w-4 h-4" />
                              <span>{web3BioProfile.links?.website?.handle || ensRecords?.records?.url}</span>
                            </a>
                          )}
                          {(ensRecords?.records?.location || web3BioProfile.location) && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>{ensRecords?.records?.location || web3BioProfile.location}</span>
                            </div>
                          )}
                         </div>
                       
                       {/* Follower Stats */}
                      <div className="flex gap-6 pt-2">
                        <button
                          onClick={async () => {
                            if (!web3BioProfile.address) return;
                            setFollowingPage(0);
                            setFollowingSearchQuery('');
                            try {
                              const response = await fetch(`https://api.ethfollow.xyz/api/v1/users/${web3BioProfile.address}/following?limit=20&offset=0`);
                              if (response.ok) {
                                const data = await response.json();
                                const followingData = data.following || [];
                                setTotalFollowing(efpStats?.following_count || 0);
                                
                                // Fetch web3.bio data for each user
                                const enrichedFollowing = await Promise.all(
                                  followingData.map(async (user: EFPUser) => {
                                    try {
                                      const { data: bioData } = await supabase.functions.invoke('get-web3bio-profile', {
                                        body: { handle: user.address }
                                      });
                                      if (bioData && Array.isArray(bioData) && bioData.length > 0) {
                                        return { ...user, web3bio: bioData[0] };
                                      }
                                    } catch (error) {
                                      console.error('Error fetching web3.bio for user:', error);
                                    }
                                    return user;
                                  })
                                );
                                
                                setFollowingList(enrichedFollowing);
                                setShowFollowingList(true);
                              }
                            } catch (error) {
                              console.error('Error fetching following list:', error);
                            }
                          }}
                          className="text-center hover:opacity-80 transition-opacity cursor-pointer"
                        >
                          <div className="text-xl sm:text-2xl font-bold text-[#D4AF37]">
                            {efpStats?.following_count ?? 0}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-400">Following</div>
                        </button>
                        <button
                          onClick={async () => {
                            if (!web3BioProfile.address) return;
                            setFollowersPage(0);
                            setFollowersSearchQuery('');
                            try {
                              const response = await fetch(`https://api.ethfollow.xyz/api/v1/users/${web3BioProfile.address}/followers?limit=20&offset=0`);
                              if (response.ok) {
                                const data = await response.json();
                                const followersData = data.followers || [];
                                setTotalFollowers(efpStats?.followers_count || 0);
                                
                                // Fetch web3.bio data for each user
                                const enrichedFollowers = await Promise.all(
                                  followersData.map(async (user: EFPUser) => {
                                    try {
                                      const { data: bioData } = await supabase.functions.invoke('get-web3bio-profile', {
                                        body: { handle: user.address }
                                      });
                                      if (bioData && Array.isArray(bioData) && bioData.length > 0) {
                                        return { ...user, web3bio: bioData[0] };
                                      }
                                    } catch (error) {
                                      console.error('Error fetching web3.bio for user:', error);
                                    }
                                    return user;
                                  })
                                );
                                
                                setFollowersList(enrichedFollowers);
                                setShowFollowersList(true);
                              }
                            } catch (error) {
                              console.error('Error fetching followers list:', error);
                            }
                          }}
                          className="text-center hover:opacity-80 transition-opacity cursor-pointer"
                        >
                          <div className="text-xl sm:text-2xl font-bold text-[#D4AF37]">
                            {efpStats?.followers_count ?? 0}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-400">Followers</div>
                        </button>
                      </div>
                      
                       {/* Social Links and ENS Records */}
                        <div className="flex flex-wrap gap-3 pt-2 justify-center">
                          {/* Twitter/X */}
                          {(web3BioProfile.links?.twitter || ensRecords?.records?.['com.twitter']) && (
                            <a
                              href={web3BioProfile.links?.twitter?.link || `https://twitter.com/${ensRecords?.records?.['com.twitter']}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
                            >
                              <span>𝕏</span>
                              <span>@{web3BioProfile.links?.twitter?.handle || ensRecords?.records?.['com.twitter']}</span>
                            </a>
                          )}
                          
                          {/* GitHub */}
                          {(web3BioProfile.links?.github || ensRecords?.records?.['com.github']) && (
                            <a
                              href={web3BioProfile.links?.github?.link || `https://github.com/${ensRecords?.records?.['com.github']}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
                            >
                              <Github className="w-4 h-4" />
                              <span>@{web3BioProfile.links?.github?.handle || ensRecords?.records?.['com.github']}</span>
                            </a>
                          )}
                          
                          {/* Discord */}
                          {ensRecords?.records?.['com.discord'] && (
                            <a
                              href={`https://discord.com/users/${ensRecords.records['com.discord']}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
                            >
                              <SiDiscord className="w-4 h-4" />
                              <span>{ensRecords.records['com.discord']}</span>
                            </a>
                          )}
                          
                          {/* Telegram */}
                          {ensRecords?.records?.['org.telegram'] && (
                            <a
                              href={`https://t.me/${ensRecords.records['org.telegram']}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
                            >
                              <Send className="w-4 h-4" />
                              <span>@{ensRecords.records['org.telegram']}</span>
                            </a>
                          )}
                        </div>
                      
                       {/* Action Buttons - Centered side by side */}
                        <div className="flex gap-6 pt-4 justify-center items-center">
                           <a
                             href={`https://web3.bio/${searchQuery}`}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="flex items-center justify-center py-3 rounded-xl transition-all duration-300 hover:opacity-80"
                           >
                             <img 
                               src={web3BioLogo} 
                               alt="Web3.bio" 
                               className="h-14 w-auto object-contain"
                             />
                           </a>
                           <a
                             href={`https://ethfollow.xyz/${web3BioProfile.address || searchQuery}`}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="flex items-center justify-center py-3 rounded-xl transition-all duration-300 hover:opacity-80"
                           >
                             <img 
                               src={efpLogoFullDark} 
                               alt="EFP" 
                               className="h-14 w-auto object-contain"
                             />
                           </a>
                        </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoadingEFP && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                <div className="bg-gray-900/90 border-2 border-[#D4AF37] rounded-lg p-6 flex flex-col items-center gap-3">
                  <Hourglass className="w-12 h-12 text-[#D4AF37] animate-pulse" />
                  <p className="text-white font-medium">Loading...</p>
                </div>
              </div>
            )}

            {/* Followers List Modal */}
            {showFollowersList && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-[#D4AF37]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col pointer-events-auto">
                  <div className="flex items-center justify-between p-4 border-b border-[#D4AF37]/30">
                    <h3 className="text-xl font-bold text-white">Followers ({totalFollowers})</h3>
                    <button
                      onClick={() => setShowFollowersList(false)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-4 border-b border-[#D4AF37]/30">
                    <div className="relative">
                      <Input
                        placeholder="Search followers..."
                        value={followersSearchQuery}
                        onChange={(e) => setFollowersSearchQuery(e.target.value)}
                        className="bg-gray-800/50 border-[#D4AF37]/30 text-white placeholder:text-gray-500 pr-10"
                      />
                      {followersSearchQuery && (
                        <button
                          onClick={() => setFollowersSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="overflow-y-auto p-4 space-y-2 flex-1">
                    {followersList
                      .filter(user => {
                        if (!followersSearchQuery) return true;
                        const query = followersSearchQuery.toLowerCase();
                        return (
                          user.address.toLowerCase().includes(query) ||
                          user.ens?.name?.toLowerCase().includes(query) ||
                          user.web3bio?.displayName?.toLowerCase().includes(query) ||
                          user.web3bio?.identity?.toLowerCase().includes(query)
                        );
                      })
                      .map((user, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors"
                        >
                          <div className="flex flex-col">
                            {(user.web3bio?.displayName || user.ens?.name) && (
                              <span className="text-white font-medium">
                                {user.web3bio?.displayName || user.ens?.name}
                              </span>
                            )}
                            <span className="text-gray-400 text-sm font-mono">
                              {user.address.slice(0, 6)}...{user.address.slice(-4)}
                            </span>
                          </div>
                          <a
                            href={`https://ethfollow.xyz/${user.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black rounded-lg text-sm font-medium transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </a>
                        </div>
                      ))}
                  </div>
                  {followersList.length < totalFollowers && (
                    <div className="p-4 border-t border-[#D4AF37]/30">
                      <Button
                        onClick={async () => {
                          if (!web3BioProfile?.address || isLoadingMore) return;
                          setIsLoadingMore(true);
                          try {
                            const nextPage = followersPage + 1;
                            const response = await fetch(
                              `https://api.ethfollow.xyz/api/v1/users/${web3BioProfile.address}/followers?limit=20&offset=${nextPage * 20}`
                            );
                            if (response.ok) {
                              const data = await response.json();
                              const newFollowers = data.followers || [];
                              
                              // Fetch web3.bio data for new users
                              const enrichedFollowers = await Promise.all(
                                newFollowers.map(async (user: EFPUser) => {
                                  try {
                                    const { data: bioData } = await supabase.functions.invoke('get-web3bio-profile', {
                                      body: { handle: user.address }
                                    });
                                    if (bioData && Array.isArray(bioData) && bioData.length > 0) {
                                      return { ...user, web3bio: bioData[0] };
                                    }
                                  } catch (error) {
                                    console.error('Error fetching web3.bio for user:', error);
                                  }
                                  return user;
                                })
                              );
                              
                              setFollowersList([...followersList, ...enrichedFollowers]);
                              setFollowersPage(nextPage);
                            }
                          } catch (error) {
                            console.error('Error loading more followers:', error);
                          }
                          setIsLoadingMore(false);
                        }}
                        className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold"
                        disabled={isLoadingMore}
                      >
                        {isLoadingMore ? 'Loading...' : 'Load More'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Following List Modal */}
            {showFollowingList && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-[#D4AF37]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col pointer-events-auto">
                  <div className="flex items-center justify-between p-4 border-b border-[#D4AF37]/30">
                    <h3 className="text-xl font-bold text-white">Following ({totalFollowing})</h3>
                    <button
                      onClick={() => setShowFollowingList(false)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-4 border-b border-[#D4AF37]/30">
                    <div className="relative">
                      <Input
                        placeholder="Search following..."
                        value={followingSearchQuery}
                        onChange={(e) => setFollowingSearchQuery(e.target.value)}
                        className="bg-gray-800/50 border-[#D4AF37]/30 text-white placeholder:text-gray-500 pr-10"
                      />
                      {followingSearchQuery && (
                        <button
                          onClick={() => setFollowingSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="overflow-y-auto p-4 space-y-2 flex-1">
                    {followingList
                      .filter(user => {
                        if (!followingSearchQuery) return true;
                        const query = followingSearchQuery.toLowerCase();
                        return (
                          user.address.toLowerCase().includes(query) ||
                          user.ens?.name?.toLowerCase().includes(query) ||
                          user.web3bio?.displayName?.toLowerCase().includes(query) ||
                          user.web3bio?.identity?.toLowerCase().includes(query)
                        );
                      })
                      .map((user, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors"
                        >
                          <div className="flex flex-col">
                            {(user.web3bio?.displayName || user.ens?.name) && (
                              <span className="text-white font-medium">
                                {user.web3bio?.displayName || user.ens?.name}
                              </span>
                            )}
                            <span className="text-gray-400 text-sm font-mono">
                              {user.address.slice(0, 6)}...{user.address.slice(-4)}
                            </span>
                          </div>
                          <a
                            href={`https://ethfollow.xyz/${user.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black rounded-lg text-sm font-medium transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </a>
                        </div>
                      ))}
                  </div>
                  {followingList.length < totalFollowing && (
                    <div className="p-4 border-t border-[#D4AF37]/30">
                      <Button
                        onClick={async () => {
                          if (!web3BioProfile?.address || isLoadingMore) return;
                          setIsLoadingMore(true);
                          try {
                            const nextPage = followingPage + 1;
                            const response = await fetch(
                              `https://api.ethfollow.xyz/api/v1/users/${web3BioProfile.address}/following?limit=20&offset=${nextPage * 20}`
                            );
                            if (response.ok) {
                              const data = await response.json();
                              const newFollowing = data.following || [];
                              
                              // Fetch web3.bio data for new users
                              const enrichedFollowing = await Promise.all(
                                newFollowing.map(async (user: EFPUser) => {
                                  try {
                                    const { data: bioData } = await supabase.functions.invoke('get-web3bio-profile', {
                                      body: { handle: user.address }
                                    });
                                    if (bioData && Array.isArray(bioData) && bioData.length > 0) {
                                      return { ...user, web3bio: bioData[0] };
                                    }
                                  } catch (error) {
                                    console.error('Error fetching web3.bio for user:', error);
                                  }
                                  return user;
                                })
                              );
                              
                              setFollowingList([...followingList, ...enrichedFollowing]);
                              setFollowingPage(nextPage);
                            }
                          } catch (error) {
                            console.error('Error loading more following:', error);
                          }
                          setIsLoadingMore(false);
                        }}
                        className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold"
                        disabled={isLoadingMore}
                      >
                        {isLoadingMore ? 'Loading...' : 'Load More'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* My ID's Section */}
            {walletAddress && showMyIDs && (
              <div className="w-full sm:max-w-3xl sm:mx-auto mt-8">
                <UserDomainsDisplay walletAddress={walletAddress} />
              </div>
            )}

            {/* Results container - same width as search bar */}
            <div className="w-full sm:max-w-3xl sm:mx-auto">
              {hasSearched && ensResults.length > 0 && !web3BioProfile && !showMyIDs && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 animate-in slide-in-from-bottom duration-500">
            {ensResults.map((result, index) => {
              const isFlipped = flippedCards.has(index);
              const isTaken = takenSubdomains.has(result.name.toLowerCase());
              const isUserOwned = displayQuery && userDomains.includes(`${displayQuery}.${result.name}`.toLowerCase());
              const isEnabled = (result as any).enabled || result.name === 'Smith.cash' || result.name === '$mith.eth';
              const isDisabled = !isEnabled || isTaken || isUserOwned;
              
              const hasSpotify = !!(result as any).spotifyUrl;
              
              return (
                <div key={index} className={`perspective-1000 ${hasSpotify ? 'min-h-[420px]' : 'min-h-[320px]'}`}>
                  <div className={`relative w-full h-full ${hasSpotify ? 'min-h-[420px]' : 'min-h-[320px]'} transition-transform duration-700 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                    {/* Front of Card */}
                    <div className="absolute inset-0 w-full h-full backface-hidden overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-[#D4AF37]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_50px_rgba(212,175,55,0.3)] transition-all duration-500 hover:scale-[1.02]">
                      
                      <div className={`relative p-6 flex flex-col items-center text-center ${hasSpotify ? 'min-h-[420px]' : 'min-h-[320px]'}`}>
                        <div className={`relative ${hasSpotify ? 'mb-4' : 'mb-6'}`}>
                          {hasSpotify ? (
                            <div className="w-full px-4 relative">
                              <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/10 to-[#F7E06C]/10 rounded-2xl blur-md -z-10"></div>
                              <iframe
                                src={(result as any).spotifyUrl.replace('/track/', '/embed/track/').replace('/playlist/', '/embed/playlist/')}
                                width="100%"
                                height="232"
                                frameBorder="0"
                                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                loading="lazy"
                                className="rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-sm"
                                style={{ border: 'none' }}
                              />
                            </div>
                          ) : (
                            <>
                              <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37] to-[#F7E06C] rounded-full blur-xl opacity-60 animate-pulse"></div>
                              <div className="relative w-28 h-28 rounded-full border-4 border-[#D4AF37] overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.6)]">
                                <img 
                                  src={result.imageUrl} 
                                  alt={result.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </>
                          )}
                        </div>
                        
                         <h3 className="font-mono text-xl font-bold text-white mb-3 leading-tight px-4 w-full break-words flex items-center justify-center">
                           {displayQuery ? `${displayQuery}.${result.name}` : result.name}
                         </h3>
                        
                        <div className={`flex items-center justify-center gap-1 ${hasSpotify ? 'mb-4' : 'mb-2'} overflow-x-auto max-w-full flex-nowrap`}>
                          {(Array.isArray(result.category) ? result.category : [result.category]).map((cat, catIndex) => (
                             <Badge 
                              key={`cat-${catIndex}`}
                              className={cn(
                                "text-xs px-2 py-0.5 flex items-center gap-1 font-semibold rounded-full border whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity",
                                cat === 'ENS' && "bg-transparent text-white border-[#D4AF37]",
                                cat === 'DNS' && "bg-transparent text-white border-blue-500",
                                cat === 'Aptos Names' && "bg-transparent text-white border-purple-500",
                                cat === 'SNS.iD' && "bg-transparent text-white border-green-500"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                // Set filter to only this protocol and apply
                                const newFilters = { protocol: [cat], club: [] };
                                setFilters(newFilters);
                                setSearchQuery('');
                                // Manually trigger filter application
                                setTimeout(() => {
                                  handleSearch();
                                }, 50);
                              }}
                            >
                              {cat === 'ENS' && <img src={ensLogoWhite} alt="ENS" className="w-3 h-3" />}
                              {cat === 'DNS' && <Globe className="w-3 h-3" />}
                              {cat === 'Aptos Names' && (
                                <img src={aptosNamesNew} alt="Aptos Names" className="w-3 h-3 rounded-sm" />
                              )}
                              {cat}
                            </Badge>
                          ))}
                          
                           {(Array.isArray(result.club) ? result.club : [result.club]).map((clubName, clubIndex) => (
                            <Badge 
                              key={`club-${clubIndex}`}
                              className={cn(
                                "text-xs px-2 py-0.5 font-semibold rounded-full whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity",
                              clubName === 'Surname' && "bg-purple-600 text-white border-0",
                              clubName === 'DeFi' && "bg-green-600 text-white border-0",
                              clubName === 'Digits' && "bg-purple-600 text-white border-0",
                              clubName === 'Dev' && "bg-blue-600 text-white border-0",
                              clubName === 'Crypto' && "bg-gray-600 text-white border-0",
                              clubName === 'Letters' && "bg-gray-600 text-white border-0",
                              clubName === 'Startup' && "bg-orange-600 text-white border-0",
                              clubName === 'Artist' && "bg-pink-600 text-white border-0"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                // Set filter to only this club and apply
                                const newFilters = { protocol: [], club: [clubName] };
                                setFilters(newFilters);
                                setSearchQuery('');
                                // Manually trigger filter application
                                setTimeout(() => {
                                  handleSearch();
                                }, 50);
                              }}
                            >
                              {clubName}
                            </Badge>
                          ))}
                        </div>
                        
                         <Button 
                           className={`w-full bg-gradient-to-r from-[#D4AF37] via-[#F7E06C] to-[#D4AF37] hover:from-[#C4A027] hover:via-[#E7D05C] hover:to-[#C4A027] text-black font-bold text-base ${hasSpotify ? 'py-5' : 'py-6'} rounded-xl shadow-[0_4px_20px_rgba(212,175,55,0.4)] hover:shadow-[0_6px_30px_rgba(212,175,55,0.6)] transition-all duration-300 transform hover:scale-105 mt-auto disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                           onClick={() => handleMint(result)}
                           disabled={isDisabled}
                         >
                           {(result as any).selectable || result.name === 'Smith.cash' || result.name === '$mith.eth'
                              ? isTaken
                                ? 'Taken'
                                : isUserOwned
                                  ? 'Taken'
                                  : t('mint_now')
                              : 'Coming Soon'
                           }
                         </Button>
                      </div>
                    </div>

                    {/* Back of Card */}
                    <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-[#D4AF37]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
                      <div className="relative p-6 h-full flex flex-col min-h-[320px]">
                        <div className="flex justify-end mb-4 flex-shrink-0">
                          <button
                            onClick={() => handleFlipCard(index)}
                            className="w-10 h-10 rounded-full bg-gray-700/80 backdrop-blur-sm border border-gray-600 flex items-center justify-center hover:bg-gray-600/80 transition-all duration-300 hover:scale-110"
                          >
                            <X size={18} className="text-white" />
                          </button>
                        </div>

                        <div className="flex flex-col items-center text-center mb-4 flex-shrink-0">
                          <div className="relative mb-3">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37] to-[#F7E06C] rounded-full blur-lg opacity-40"></div>
                            <div className="relative w-24 h-24 rounded-full border-3 border-[#D4AF37] overflow-hidden shadow-lg">
                              <img 
                                src={result.imageUrl} 
                                alt={result.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                          
                           <h4 className="font-mono text-xl font-bold text-white leading-tight px-4 break-words flex items-center justify-center">
                             {displayQuery ? `${displayQuery}.${result.name}` : result.name}
                           </h4>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto px-2">
                          <p 
                            className="text-sm text-gray-300 leading-relaxed text-center break-words" 
                            dangerouslySetInnerHTML={{ __html: result.description }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
              
              {/* No Results State */}
              {hasSearched && ensResults.length === 0 && !web3BioProfile && !isLoading && !showMyIDs && (
                <div className="text-center py-12 animate-in fade-in duration-500">
                  <p className="text-gray-400 text-lg mb-2">No results found</p>
                  <p className="text-sm text-gray-500">
                    Try searching with a different query
                  </p>
                  {theme === 'light' && (
                    <img 
                      src={noResultsGif} 
                      alt="No results found" 
                      className="w-48 h-48 mx-auto mt-6 object-contain"
                    />
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};
