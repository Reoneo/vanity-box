import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink, MessageCircle, Repeat2, Heart, Loader2, Search, Filter, ChevronDown, Link2, Globe, Mail, Calendar, X, Pencil } from "lucide-react";
import type { OnchainProfileData } from "@/lib/iota/vanityProfile";
import { toast } from "sonner";

// Helper to validate EVM address format (40 hex chars after 0x)
// IOTA and other non-EVM addresses are longer and should not be passed to EVM APIs
const isValidEvmAddress = (address?: string): boolean => {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/i.test(address);
};
import { SocialIcon } from "./SocialIcon";
import { normalizeSocialUrl } from "@/lib/socialLinks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useMemo, useRef } from "react";
import { PoapDetailModal } from "./PoapDetailModal";
import { NFTDetailModal } from "./NFTDetailModal";
import { ENSDomainDetailModal } from "./ENSDomainDetailModal";
import { ActivityGraph } from "./ActivityGraph";
import { formatDistanceToNow } from "date-fns";
import type { FarcasterCast } from "@/types/farcaster";
import defaultHeader from '@/assets/default-header-pattern.png';
import iotaHeaderPattern from '@/assets/iota-header-pattern.png';
import vanityBoxAvatar from '@/assets/vanity-box-default-avatar.png';
import ethLogo from '@/assets/eth-logo-dark.svg';
import wldLogo from '@/assets/wld-logo-dark.svg';

import { useDisplayName } from "@/hooks/useDisplayName";
import { useWorldchainNFTs } from "@/hooks/useWorldchainNFTs";
import { WorldchainNFTSection } from "./WorldchainNFTSection";
import { TalentProtocolModal } from "./TalentProtocolModal";
import { PolymarketModal } from "./PolymarketModal";
import CredentialsCarousel from "./CredentialsCarousel";
import { BioTicker } from "./BioTicker";
import { ChronologicalPoapGrid } from "./ChronologicalPoapGrid";
import { useIsMobile } from "@/hooks/use-mobile";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

interface ProfileCardProps {
  activeSection: 'profile' | 'socials' | 'nfts' | 'farcaster';
  web3BioProfile?: any;
  currentWalletAddress?: string;
  connectedWalletAddress?: string;
  efpStats?: any;
  poaps?: any[];
  poapTotalCount?: number;
  poapHasMore?: boolean;
  poapLoadingMore?: boolean;
  onLoadMorePoaps?: () => void;
  socialIcons?: Record<string, string>;
  nfts?: any[];
  nftLoading?: boolean;
  nftNextCursor?: string | null;
  latestCast?: FarcasterCast | null;
  castLoading?: boolean;
  firstTransactionDate?: string | null;
  searchedIdentity?: string;
  openseaAttempted?: boolean;
  openseaHasErrors?: boolean;
  onFollowingClick?: () => void;
  onFollowersClick?: () => void;
  onLoadMoreNfts?: () => void;
  onEnsureOpenSeaNfts?: () => void;
  // Linked EVM address for .iota profiles
  linkedEvmAddress?: string | null;
  isResolvingLinkedEvm?: boolean;
  // IOTA Onchain Profile props
  iotaOnchainProfile?: OnchainProfileData | null;
  iotaNameObjectId?: string | null;
  iotaOwnerAddress?: string | null;
  onEditIotaProfile?: () => void;
}

// Official IOTA icon URL
const IOTA_ICON_URL = "https://d315pvdvxi2gex.cloudfront.net/d96a337f84c5c900f31e08817.svg";

// Chain icon helper function for activity feed
const getChainIcon = (chain: string, size: number = 18) => {
  const chainLower = (chain || 'ethereum').toLowerCase();
  const iconClass = 'rounded-full';
  
  switch (chainLower) {
    case 'iota':
      return <img src={IOTA_ICON_URL} alt="IOTA" width={size} height={size} className={iconClass} />;
    case 'ethereum':
    case 'eth':
      return <img src={ethLogo} alt="Ethereum" width={size} height={size} className={iconClass} />;
    case 'worldchain':
    case 'world':
      return <img src={wldLogo} alt="World Chain" width={size} height={size} className={iconClass} />;
    case 'polygon':
    case 'matic':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={iconClass}>
          <circle cx="16" cy="16" r="16" fill="#8247E5" />
          <path d="M21.2 13.2c-.5-.3-1.1-.3-1.5 0l-3.5 2-2.4 1.4-3.5 2c-.5.3-1.1.3-1.5 0l-2.7-1.6c-.5-.3-.8-.8-.8-1.4v-3.1c0-.6.3-1.1.8-1.4l2.7-1.5c.5-.3 1.1-.3 1.5 0l2.7 1.6c.5.3.8.8.8 1.4v2l2.4-1.4v-2c0-.6-.3-1.1-.8-1.4l-5-2.9c-.5-.3-1.1-.3-1.5 0l-5.1 2.9c-.5.3-.8.8-.8 1.4v5.8c0 .6.3 1.1.8 1.4l5.1 2.9c.5.3 1.1.3 1.5 0l3.5-2 2.4-1.4 3.5-2c.5-.3 1.1-.3 1.5 0l2.7 1.5c.5.3.8.8.8 1.4v3.1c0 .6-.3 1.1-.8 1.4l-2.7 1.6c-.5.3-1.1.3-1.5 0l-2.7-1.6c-.5-.3-.8-.8-.8-1.4v-2l-2.4 1.4v2c0 .6.3 1.1.8 1.4l5.1 2.9c.5.3 1.1.3 1.5 0l5.1-2.9c.5-.3.8-.8.8-1.4v-5.8c0-.6-.3-1.1-.8-1.4l-5.1-2.9z" fill="#fff"/>
        </svg>
      );
    case 'arbitrum':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={iconClass}>
          <circle cx="16" cy="16" r="16" fill="#2D374B" />
          <path d="M16.6 8.5l6.9 11c.2.3.2.7 0 1l-2.5 4c-.2.3-.5.5-.9.5h-8.2c-.4 0-.7-.2-.9-.5l-2.5-4c-.2-.3-.2-.7 0-1l6.9-11c.4-.6 1.4-.6 1.8 0h-.6z" fill="#28A0F0"/>
          <path d="M15.4 13l-4.9 7.8 2 3.2h6.8l-3.9-11z" fill="#fff"/>
        </svg>
      );
    case 'optimism':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={iconClass}>
          <circle cx="16" cy="16" r="16" fill="#FF0420" />
          <path d="M10.5 20.5c-1.9 0-3.4-.6-4.5-1.7-1.1-1.2-1.6-2.8-1.6-4.8 0-2.2.6-4 1.8-5.4 1.2-1.4 2.9-2.1 5-2.1 1.9 0 3.3.5 4.3 1.6 1 1 1.5 2.5 1.5 4.3v.8H7.5c0 1.3.3 2.3 1 3 .6.7 1.5 1 2.6 1 .8 0 1.5-.1 2-.4.6-.3 1-.7 1.3-1.3h3.4c-.5 1.4-1.3 2.5-2.5 3.3-1.1.8-2.5 1.2-4.2 1.2h-.6z" fill="#fff"/>
        </svg>
      );
    case 'base':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={iconClass}>
          <circle cx="16" cy="16" r="16" fill="#0052FF" />
          <path d="M16 26c5.523 0 10-4.477 10-10S21.523 6 16 6 6 10.477 6 16s4.477 10 10 10z" fill="#0052FF"/>
          <path d="M16 24c4.418 0 8-3.582 8-8s-3.582-8-8-8c-4.08 0-7.446 3.054-7.938 7h11.876v2H8.062c.492 3.946 3.858 7 7.938 7z" fill="#fff"/>
        </svg>
      );
    case 'bsc':
    case 'binance':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={iconClass}>
          <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
          <path d="M12.1 14.5l3.9-3.9 3.9 3.9 2.3-2.3L16 6l-6.2 6.2 2.3 2.3zm-4.6 1.5L5.2 16l2.3 2.3L9.8 16l-2.3-2zm4.6 1.5L16 21.4l3.9-3.9 2.3 2.3-6.2 6.2-6.2-6.2 2.3-2.4v.1zm10.7-1.5L20.5 16l2.3 2.3 2.3-2.3-2.3-2zM18.3 16L16 13.7 14.3 15.4l-.4.4-.3.2 2.4 2.4L18.3 16z" fill="#fff"/>
        </svg>
      );
    case 'avalanche':
    case 'avax':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={iconClass}>
          <circle cx="16" cy="16" r="16" fill="#E84142" />
          <path d="M20.3 21h3.5c.6 0 .9 0 1.1-.2.2-.1.4-.4.4-.6 0-.2-.1-.5-.2-.8l-7.6-13.5c-.2-.3-.4-.6-.6-.7-.2-.2-.5-.2-.9-.2s-.7.1-.9.2c-.2.2-.4.4-.6.7L13 8.8l-1.7 3-.1.2c-.2.3-.3.6-.3.9 0 .3.1.5.3.7.2.2.5.3.8.3h4.3l.2.1c.2.1.3.3.5.6l2.4 4.4c.2.3.3.5.3.7 0 .2-.1.5-.3.7-.2.2-.5.3-.9.3H11.9c-.4 0-.7 0-.9.2-.2.2-.4.4-.4.7 0 .2.1.5.2.8l1.5 2.7c.2.3.3.5.5.7.2.1.5.2.9.2h6.6z" fill="#fff"/>
        </svg>
      );
    case 'zora':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={iconClass}>
          <circle cx="16" cy="16" r="16" fill="#000" />
          <circle cx="16" cy="16" r="8" fill="#fff" />
        </svg>
      );
    case 'solana':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={iconClass}>
          <circle cx="16" cy="16" r="16" fill="#000" />
          <defs>
            <linearGradient id="sol-grad-activity" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00FFA3" />
              <stop offset="100%" stopColor="#DC1FFF" />
            </linearGradient>
          </defs>
          <path d="M9.5 18.8l2.2-2.2c.1-.1.3-.2.4-.2h10.4c.3 0 .4.3.2.5l-2.2 2.2c-.1.1-.3.2-.4.2H9.7c-.3 0-.4-.3-.2-.5zm2.2-6.3c.1-.1.3-.2.4-.2h10.4c.3 0 .4.3.2.5l-2.2 2.2c-.1.1-.3.2-.4.2H9.7c-.3 0-.4-.3-.2-.5l2.2-2.2zm8.6-2.3l-2.2 2.2c-.1.1-.3.2-.4.2H7.3c-.3 0-.4-.3-.2-.5l2.2-2.2c.1-.1.3-.2.4-.2h10.4c.3 0 .4.3.2.5z" fill="url(#sol-grad-activity)"/>
        </svg>
      );
    default:
      return <img src={ethLogo} alt="Network" width={size} height={size} className={iconClass} />;
  }
};

export const ProfileCard = ({
  activeSection,
  web3BioProfile,
  currentWalletAddress,
  connectedWalletAddress,
  efpStats,
  poaps = [],
  poapTotalCount,
  poapHasMore = false,
  poapLoadingMore = false,
  onLoadMorePoaps,
  socialIcons = {},
  nfts = [],
  nftLoading = false,
  nftNextCursor = null,
  latestCast = null,
  castLoading = false,
  firstTransactionDate = null,
  searchedIdentity,
  openseaAttempted = false,
  openseaHasErrors = false,
  onFollowingClick,
  onFollowersClick,
  onLoadMoreNfts,
  onEnsureOpenSeaNfts,
  linkedEvmAddress,
  isResolvingLinkedEvm = false,
  iotaOnchainProfile,
  iotaNameObjectId,
  iotaOwnerAddress,
  onEditIotaProfile,
}: ProfileCardProps) => {
  const [copied, setCopied] = useState(false);
  const [selectedPoap, setSelectedPoap] = useState<any>(null);
  const [selectedNft, setSelectedNft] = useState<any>(null);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [expandedCollection, setExpandedCollection] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<string>("all");
  const [showAllSocials, setShowAllSocials] = useState(false);
  const [showNftsOverlay, setShowNftsOverlay] = useState(false);
  const [nftCategory, setNftCategory] = useState<'main' | 'poaps' | 'opensea' | 'magiceden' | 'worldchain' | 'hyperliquid' | 'ensdomains' | 'basenames' | 'iotanames'>('main');
  
  // IOTA-specific state
  const [iotaTokens, setIotaTokens] = useState<any[]>([]);
  const [iotaNfts, setIotaNfts] = useState<any[]>([]);
  const [iotaLoading, setIotaLoading] = useState(false);
  const [iotaFetched, setIotaFetched] = useState(false);
  const [ensDomains, setEnsDomains] = useState<any[]>([]);
  const [ensDomainsLoading, setEnsDomainsLoading] = useState(true);
  const [ensDomainsFetched, setEnsDomainsFetched] = useState(false);
  const [selectedEnsDomain, setSelectedEnsDomain] = useState<any>(null);
  const [basenames, setBasenames] = useState<any[]>([]);
  const [basenamesLoading, setBasenamesLoading] = useState(true);
  const [basenamesFetched, setBasenamesFetched] = useState(false);
  const [selectedBasename, setSelectedBasename] = useState<any>(null);
  const [magicEdenNfts, setMagicEdenNfts] = useState<any[]>([]);
  const [magicEdenLoading, setMagicEdenLoading] = useState(false);
  const [hlNfts, setHlNfts] = useState<any[]>([]);
  const [hlTokens, setHlTokens] = useState<any[]>([]);
  const [hlLoading, setHlLoading] = useState(false);
  const [portfolioTokens, setPortfolioTokens] = useState<any[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioTotalValue, setPortfolioTotalValue] = useState<number>(0);
  const [showTokensOverlay, setShowTokensOverlay] = useState(false);
  const [showActivityOverlay, setShowActivityOverlay] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [tokensFetched, setTokensFetched] = useState(false);
  const [transactionsFetched, setTransactionsFetched] = useState(false);
  const [showTalentModal, setShowTalentModal] = useState(false);
  const [showPolymarketModal, setShowPolymarketModal] = useState(false);
  const [hasTalentData, setHasTalentData] = useState(false);
  const [talentLoading, setTalentLoading] = useState(false);
  const [talentScore, setTalentScore] = useState<number | null>(null);
  const [talentCreatorScore, setTalentCreatorScore] = useState<number | null>(null);
  const [hasPolymarketData, setHasPolymarketData] = useState(false);
  const [polymarketWinRate, setPolymarketWinRate] = useState<number | null>(null);
  const [polymarketProfit, setPolymarketProfit] = useState<number | null>(null);
  const [isHumanVerified, setIsHumanVerified] = useState(false);
  const [showAvatarPopup, setShowAvatarPopup] = useState(false);
  const [showHeaderPopup, setShowHeaderPopup] = useState(false);
  
  // Desktop split layout state - which panel to show on the right
  const [desktopActivePanel, setDesktopActivePanel] = useState<'nfts' | 'social' | 'tokens' | 'activity' | null>(null);
  const isMobile = useIsMobile();

  // Re-fetch Talent Protocol for IOTA profiles once linkedEvmAddress resolves
  useEffect(() => {
    const isIota = searchedIdentity?.toLowerCase().endsWith('.iota') || 
                   web3BioProfile?.platform === 'iota';
    if (!isIota || !linkedEvmAddress || hasTalentData) return;

    const fetchTalentForIota = async () => {
      setTalentLoading(true);
      try {
        const talentRes = await fetch('https://gdjjboorqviobvvygpca.supabase.co/functions/v1/get-talent-protocol', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkampib29ycXZpb2J2dnlncGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDY1NDIsImV4cCI6MjA3MzEyMjU0Mn0.88t9gQHYr2kWB3P0Prd1ehRTsP3hYemV6PEkOLQa7tE',
          },
          body: JSON.stringify({ wallet: linkedEvmAddress }),
        });
        const talentData = await talentRes.json();
        console.log('[ProfileCard] Talent Protocol for IOTA linked EVM:', talentData);
        if (!talentData.noData && !talentData.error && talentData.scores) {
          const builderVal = talentData.scores.builder?.value ?? 0;
          const creatorVal = talentData.scores.creator?.value ?? 0;
          setHasTalentData(builderVal > 0 || creatorVal > 0);
          setTalentScore(builderVal > 0 ? builderVal : null);
          setTalentCreatorScore(creatorVal > 0 ? creatorVal : null);
          const hasHumanVerification = 
            talentData.verification?.humanCheckmark?.isVerified === true ||
            (talentData.verification?.humanCheckmark?.providers?.length > 0);
          setIsHumanVerified(hasHumanVerification);
        }
      } catch (e) {
        console.error('Talent Protocol IOTA fetch error:', e);
      } finally {
        setTalentLoading(false);
      }
    };
    fetchTalentForIota();
  }, [linkedEvmAddress, searchedIdentity, web3BioProfile?.platform, hasTalentData]);

  // Fetch EVM tokens via Zerion for .iota profiles with linked Ethereum wallets and merge with IOTA tokens
  const iotaTokensRef = useRef<any[]>([]);
  iotaTokensRef.current = iotaTokens;
  const [evmTokensFetchedForIota, setEvmTokensFetchedForIota] = useState(false);

  useEffect(() => {
    const isIota = searchedIdentity?.toLowerCase().endsWith('.iota') || 
                   web3BioProfile?.platform === 'iota';
    if (!isIota || !linkedEvmAddress || evmTokensFetchedForIota) return;
    if (!/^0x[a-fA-F0-9]{40}$/i.test(linkedEvmAddress)) return;

    const fetchEvmTokensForIota = async () => {
      try {
        console.log('[ProfileCard] Fetching Zerion EVM tokens for linked wallet:', linkedEvmAddress);
        const tokenRes = await fetch('https://gdjjboorqviobvvygpca.supabase.co/functions/v1/get-wallet-portfolio', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkampib29ycXZpb2J2dnlncGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDY1NDIsImV4cCI6MjA3MzEyMjU0Mn0.88t9gQHYr2kWB3P0Prd1ehRTsP3hYemV6PEkOLQa7tE',
          },
          body: JSON.stringify({ walletAddress: linkedEvmAddress }),
        });
        const tokenData = await tokenRes.json();
        console.log('[ProfileCard] Zerion EVM tokens for IOTA profile:', tokenData);

        if (tokenData.tokens && tokenData.tokens.length > 0) {
          const currentIotaTokens = iotaTokensRef.current;
          const merged = [...currentIotaTokens, ...tokenData.tokens];
          setPortfolioTokens(merged);
          const iotaTotal = currentIotaTokens.reduce((sum: number, t: any) => sum + (t.value || 0), 0);
          const evmTotal = tokenData.totalValue || 0;
          setPortfolioTotalValue(iotaTotal + evmTotal);
        }
        setEvmTokensFetchedForIota(true);
      } catch (e) {
        console.error('[ProfileCard] Zerion EVM fetch for IOTA profile error:', e);
        setEvmTokensFetchedForIota(true);
      }
    };
    fetchEvmTokensForIota();
  }, [linkedEvmAddress, searchedIdentity, web3BioProfile?.platform, evmTokensFetchedForIota]);


  // Resolve ENS name for wallet address searches
  const { displayName: resolvedEnsName } = useDisplayName(
    currentWalletAddress as `0x${string}` | undefined
  );

  const { collections: worldchainCollections, isLoading: worldchainNftsLoading } = useWorldchainNFTs(currentWalletAddress);

  const worldchainNftCount = useMemo(
    () => worldchainCollections.reduce((sum, c) => sum + (c.nftCount || 0), 0),
    [worldchainCollections]
  );

  // Detect if this is an IOTA profile
  const isIotaProfile = useMemo(() => {
    return searchedIdentity?.toLowerCase().endsWith('.iota') || 
           web3BioProfile?.platform === 'iota' ||
           web3BioProfile?.iotaDomain;
  }, [searchedIdentity, web3BioProfile]);

  // Check if the connected wallet is the owner of this IOTA profile
  const isIotaProfileOwner = useMemo(() => {
    if (!isIotaProfile || !connectedWalletAddress || !iotaOwnerAddress) {
      console.log('🔐 IOTA owner check failed:', { isIotaProfile, connectedWalletAddress, iotaOwnerAddress });
      return false;
    }
    const isOwner = connectedWalletAddress.toLowerCase() === iotaOwnerAddress.toLowerCase();
    console.log('🔐 IOTA owner check:', { connectedWalletAddress, iotaOwnerAddress, isOwner });
    return isOwner;
  }, [isIotaProfile, connectedWalletAddress, iotaOwnerAddress]);

  // Get the best display name to show
  const getDisplayName = () => {
    // If searchedIdentity contains a dot, it's a domain name - use it directly
    if (searchedIdentity && searchedIdentity.includes('.')) {
      return searchedIdentity;
    }
    
    // If we have a resolved ENS name from the hook, use it
    if (resolvedEnsName) {
      return resolvedEnsName;
    }
    
    // Fallback chain
    return web3BioProfile?.hlDomain || 
           web3BioProfile?.displayName || 
           (currentWalletAddress ? shortenAddress(currentWalletAddress) : 'Unknown');
  };

  // Fetch all data on profile load for button visibility
  // PRIORITY: Fetch Talent Protocol FIRST so badge shows immediately (skip for IOTA profiles)
  useEffect(() => {
    if (currentWalletAddress && !dataLoaded) {
      setDataLoaded(true);
      
      // Check if this is an IOTA profile
      const isIota = searchedIdentity?.toLowerCase().endsWith('.iota') || 
                     web3BioProfile?.platform === 'iota';
      
      // For IOTA profiles, use linkedEvmAddress; otherwise use currentWalletAddress
      const talentWallet = isIota ? linkedEvmAddress : currentWalletAddress;
      
      // PRIORITY 1: Fetch Talent Protocol data IMMEDIATELY
      const fetchTalentFirst = async () => {
        if (!talentWallet) {
          console.log('Skipping Talent Protocol: no EVM wallet available');
          setTalentLoading(false);
          return;
        }
        
        setTalentLoading(true);
        try {
          const talentRes = await fetch('https://gdjjboorqviobvvygpca.supabase.co/functions/v1/get-talent-protocol', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkampib29ycXZpb2J2dnlncGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDY1NDIsImV4cCI6MjA3MzEyMjU0Mn0.88t9gQHYr2kWB3P0Prd1ehRTsP3hYemV6PEkOLQa7tE',
            },
            body: JSON.stringify({ 
              wallet: talentWallet,
              ens: searchedIdentity?.includes('.') ? searchedIdentity : undefined 
            }),
          });
          const talentData = await talentRes.json();
          console.log('[ProfileCard] Talent Protocol response (PRIORITY):', talentData);
          if (!talentData.noData && !talentData.error && talentData.scores) {
            const builderVal = talentData.scores.builder?.value ?? 0;
            const creatorVal = talentData.scores.creator?.value ?? 0;
            setHasTalentData(builderVal > 0 || creatorVal > 0);
            setTalentScore(builderVal > 0 ? builderVal : null);
            setTalentCreatorScore(creatorVal > 0 ? creatorVal : null);
            
            const hasHumanVerification = 
              talentData.verification?.humanCheckmark?.isVerified === true ||
              (talentData.verification?.humanCheckmark?.providers?.length > 0);
            setIsHumanVerified(hasHumanVerification);
          }
        } catch (e) { 
          console.error('Talent Protocol fetch error:', e); 
        } finally {
          setTalentLoading(false);
        }
      };
      
      // Start Talent fetch IMMEDIATELY
      fetchTalentFirst();
      
      // Fetch other data in parallel (non-blocking)
      const fetchOtherData = async () => {
        // Check if the address is a valid EVM address (40 hex chars)
        // IOTA and other non-EVM addresses are longer and should not be passed to EVM-specific APIs
        const isEvm = isValidEvmAddress(currentWalletAddress);
        
        if (!isEvm) {
          console.log('Skipping EVM-specific API calls for non-EVM address:', currentWalletAddress);
          setTokensFetched(true);
          setTransactionsFetched(true);
        }

        // Fetch tokens (EVM only)
        if (isEvm) {
          try {
            const tokenRes = await fetch('https://gdjjboorqviobvvygpca.supabase.co/functions/v1/get-wallet-portfolio', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkampib29ycXZpb2J2dnlncGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDY1NDIsImV4cCI6MjA3MzEyMjU0Mn0.88t9gQHYr2kWB3P0Prd1ehRTsP3hYemV6PEkOLQa7tE',
              },
              body: JSON.stringify({ walletAddress: currentWalletAddress }),
            });
            const tokenData = await tokenRes.json();
            console.log('Portfolio API response:', tokenData);
            if (tokenData.tokens) setPortfolioTokens(tokenData.tokens);
            if (tokenData.totalValue) setPortfolioTotalValue(tokenData.totalValue);
          } catch (e) { 
            console.error('Token fetch error:', e); 
          } finally {
            setTokensFetched(true);
          }
        }

        // Fetch transactions for Activity button (EVM only)
        if (isEvm) {
          try {
            const txRes = await fetch('https://gdjjboorqviobvvygpca.supabase.co/functions/v1/get-wallet-transactions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkampib29ycXZpb2J2dnlncGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDY1NDIsImV4cCI6MjA3MzEyMjU0Mn0.88t9gQHYr2kWB3P0Prd1ehRTsP3hYemV6PEkOLQa7tE',
              },
              body: JSON.stringify({ walletAddress: currentWalletAddress }),
            });
            const txData = await txRes.json();
            console.log('Transactions API response:', txData);
            if (txData.transactions) setTransactions(txData.transactions);
          } catch (e) { 
            console.error('Transactions fetch error:', e); 
          } finally {
            setTransactionsFetched(true);
          }
        }

        // Fetch Magic Eden NFTs (EVM only)
        if (isEvm) {
          try {
            const meRes = await fetch('https://gdjjboorqviobvvygpca.supabase.co/functions/v1/get-magiceden-nfts', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkampib29ycXZpb2J2dnlncGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDY1NDIsImV4cCI6MjA3MzEyMjU0Mn0.88t9gQHYr2kWB3P0Prd1ehRTsP3hYemV6PEkOLQa7tE',
              },
              body: JSON.stringify({ walletAddress: currentWalletAddress }),
            });
            const meData = await meRes.json();
            if (meData.nfts) setMagicEdenNfts(meData.nfts);
          } catch (e) { console.error('Magic Eden fetch error:', e); }
        }

        // Fetch ENS Domains from The Graph
        try {
          const ensRes = await fetch('https://gdjjboorqviobvvygpca.supabase.co/functions/v1/get-ens-domains', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkampib29ycXZpb2J2dnlncGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDY1NDIsImV4cCI6MjA3MzEyMjU0Mn0.88t9gQHYr2kWB3P0Prd1ehRTsP3hYemV6PEkOLQa7tE',
            },
            body: JSON.stringify({ walletAddress: currentWalletAddress }),
          });
          const ensData = await ensRes.json();
          console.log('ENS Domains response:', ensData);
          if (ensData.domains) setEnsDomains(ensData.domains);
        } catch (e) { 
          console.error('ENS Domains fetch error:', e); 
        } finally {
          setEnsDomainsLoading(false);
          setEnsDomainsFetched(true);
        }

        // Fetch Basenames from Base subgraph
        try {
          const baseRes = await fetch('https://gdjjboorqviobvvygpca.supabase.co/functions/v1/get-basenames', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkampib29ycXZpb2J2dnlncGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDY1NDIsImV4cCI6MjA3MzEyMjU0Mn0.88t9gQHYr2kWB3P0Prd1ehRTsP3hYemV6PEkOLQa7tE',
            },
            body: JSON.stringify({ walletAddress: currentWalletAddress }),
          });
          const baseData = await baseRes.json();
          console.log('Basenames response:', baseData);
          if (baseData.domains) setBasenames(baseData.domains);
        } catch (e) { 
          console.error('Basenames fetch error:', e); 
        } finally {
          setBasenamesLoading(false);
          setBasenamesFetched(true);
        }

        // Fetch Polymarket data (skip for IOTA profiles)
        if (!isIota && isEvm) {
          try {
            const polyRes = await fetch('https://gdjjboorqviobvvygpca.supabase.co/functions/v1/get-polymarket-data', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkampib29ycXZpb2J2dnlncGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDY1NDIsImV4cCI6MjA3MzEyMjU0Mn0.88t9gQHYr2kWB3P0Prd1ehRTsP3hYemV6PEkOLQa7tE',
              },
              body: JSON.stringify({ wallet: currentWalletAddress }),
            });
            const polyData = await polyRes.json();
            console.log('Polymarket response:', polyData);
            if (!polyData.noData && !polyData.error && (polyData.openPositions?.length > 0 || polyData.totalTrades > 0)) {
              setHasPolymarketData(true);
              if (typeof polyData.winRate === 'number') {
                setPolymarketWinRate(polyData.winRate);
              }
              if (typeof polyData.profit === 'number') {
                setPolymarketProfit(polyData.profit);
              }
            }
          } catch (e) { 
            console.error('Polymarket fetch error:', e); 
          }
        }

        // Fetch IOTA data via native IOTA RPC (tokens, NFTs, transactions in parallel)
        if (isIota) {
          setIotaLoading(true);
          setTransactionsLoading(true);
          
          const iotaFetchPromises = [
            // Fetch IOTA tokens via native RPC
            fetch('https://gdjjboorqviobvvygpca.supabase.co/functions/v1/get-iota-tokens', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkampib29ycXZpb2J2dnlncGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDY1NDIsImV4cCI6MjA3MzEyMjU0Mn0.88t9gQHYr2kWB3P0Prd1ehRTsP3hYemV6PEkOLQa7tE',
              },
              body: JSON.stringify({ walletAddress: currentWalletAddress }),
            }).then(res => res.json()).catch(e => ({ error: e.message, tokens: [] })),
            
            // Fetch IOTA NFTs via native RPC
            fetch('https://gdjjboorqviobvvygpca.supabase.co/functions/v1/get-iota-nfts', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkampib29ycXZpb2J2dnlncGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDY1NDIsImV4cCI6MjA3MzEyMjU0Mn0.88t9gQHYr2kWB3P0Prd1ehRTsP3hYemV6PEkOLQa7tE',
              },
              body: JSON.stringify({ walletAddress: currentWalletAddress }),
            }).then(res => res.json()).catch(e => ({ error: e.message, nfts: [] })),
            
            // Fetch IOTA transactions via native RPC
            fetch('https://gdjjboorqviobvvygpca.supabase.co/functions/v1/get-iota-transactions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkampib29ycXZpb2J2dnlncGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDY1NDIsImV4cCI6MjA3MzEyMjU0Mn0.88t9gQHYr2kWB3P0Prd1ehRTsP3hYemV6PEkOLQa7tE',
              },
              body: JSON.stringify({ walletAddress: currentWalletAddress }),
            }).then(res => res.json()).catch(e => ({ error: e.message, transactions: [] })),
          ];
          
          try {
            const [tokensData, nftsData, txData] = await Promise.all(iotaFetchPromises);
            
            console.log('IOTA Tokens:', tokensData);
            console.log('IOTA NFTs:', nftsData);
            console.log('IOTA Transactions:', txData);
            
            if (tokensData.tokens) {
              const enrichedTokens = tokensData.tokens.map((t: any) => ({
                ...t,
                icon: t.icon && !t.icon.includes('coingecko') ? t.icon : (t.symbol?.toUpperCase() === 'IOTA' ? IOTA_ICON_URL : t.icon),
              }));
              setIotaTokens(enrichedTokens);
              setPortfolioTokens(enrichedTokens);
              if (tokensData.totalValue) setPortfolioTotalValue(tokensData.totalValue);
            }
            if (nftsData.nfts) setIotaNfts(nftsData.nfts);
            if (txData.transactions) setTransactions(txData.transactions);
          } catch (e) { 
            console.error('IOTA fetch error:', e);
          } finally {
            setIotaLoading(false);
            setIotaFetched(true);
            setTokensFetched(true);
            setTransactionsLoading(false);
            setTransactionsFetched(true);
          }
        }
      };
      
      // Start other data fetch in parallel
      fetchOtherData();
    }
  }, [currentWalletAddress, dataLoaded, searchedIdentity]);

  // Fetch Hyperliquid NFTs/tokens from profile data
  useEffect(() => {
    if (web3BioProfile?.hlNfts?.length > 0) setHlNfts(web3BioProfile.hlNfts);
    if (web3BioProfile?.hlTokens?.length > 0) setHlTokens(web3BioProfile.hlTokens);
  }, [web3BioProfile?.hlNfts, web3BioProfile?.hlTokens]);

  // Auto-select default desktop panel based on data availability (priority: Socials → Tokens → Activity → NFTs)
  useEffect(() => {
    if (isMobile || desktopActivePanel !== null) return;
    
    const hasSocialsData = web3BioProfile?.links && Object.entries(web3BioProfile.links)
      .filter(([platform, linkData]) => platform.toLowerCase() !== 'website' && platform.toLowerCase() !== 'email' && linkData)
      .length > 0;
    const hasTokensData = portfolioTokens.length > 0;
    const hasActivityData = transactions.length > 0;
    const hasNftsData = nfts.length > 0 || poaps.length > 0 || magicEdenNfts.length > 0 || worldchainNftCount > 0 || hlNfts.length > 0 || ensDomains.length > 0 || basenames.length > 0;
    
    if (hasSocialsData) {
      setDesktopActivePanel('social');
    } else if (hasTokensData) {
      setDesktopActivePanel('tokens');
    } else if (hasActivityData) {
      setDesktopActivePanel('activity');
    } else if (hasNftsData) {
      setDesktopActivePanel('nfts');
      onEnsureOpenSeaNfts?.();
    }
    // If nothing available, desktopActivePanel stays null and "No Onchain Data" will show
  }, [isMobile, desktopActivePanel, nfts, poaps, magicEdenNfts, worldchainNftCount, hlNfts, ensDomains, basenames, web3BioProfile?.links, portfolioTokens, transactions, onEnsureOpenSeaNfts]);

  // Transactions are now fetched on profile load - no need for overlay-triggered fetch

  // No need to disable body scrolling - parent container handles overflow

  // Get unique collections from NFTs
  const availableCollections = useMemo(() => {
    const collections = new Set(nfts.map(nft => nft.collection || 'Unknown Collection'));
    return Array.from(collections).sort();
  }, [nfts]);

  // Filter NFTs by selected collections (no longer excluding POAPs)
  const filteredNfts = useMemo(() => {
    if (selectedCollections.length === 0) {
      return nfts;
    }
    return nfts.filter(nft => {
      const collection = nft.collection || 'Unknown Collection';
      return selectedCollections.includes(collection);
    });
  }, [nfts, selectedCollections]);

  // Group OpenSea NFTs by collection (excluding POAPs)
  const openSeaGroupedNfts = useMemo(() => {
    const groups: Record<string, any[]> = {};
    
    // Add regular NFTs (OpenSea only)
    filteredNfts.forEach(nft => {
      const collection = nft.collection || 'Unknown Collection';
      if (!groups[collection]) {
        groups[collection] = [];
      }
      groups[collection].push(nft);
    });

    // Sort collections by NFT count
    return Object.fromEntries(
      Object.entries(groups).sort(([, a], [, b]) => b.length - a.length)
    );
  }, [filteredNfts]);

  // Group Magic Eden NFTs by collection
  const magicEdenGroupedNfts = useMemo(() => {
    const groups: Record<string, any[]> = {};
    
    magicEdenNfts.forEach(nft => {
      const collection = nft.collection || 'World Chain Collection';
      if (!groups[collection]) {
        groups[collection] = [];
      }
      groups[collection].push(nft);
    });

    // Sort collections by NFT count
    return Object.fromEntries(
      Object.entries(groups).sort(([, a], [, b]) => b.length - a.length)
    );
  }, [magicEdenNfts]);

  // Format POAPs for display
  const formattedPoaps = useMemo(() => {
    return poaps.map(poap => ({
      ...poap,
      collection: 'POAPs',
      name: poap.eventName,
      image_url: poap.eventImageUrl,
      identifier: poap.tokenId,
      isPoap: true,
    }));
  }, [poaps]);

  const handleCollectionToggle = (collection: string) => {
    setSelectedCollections(prev => 
      prev.includes(collection)
        ? prev.filter(c => c !== collection)
        : [...prev, collection]
    );
  };

  // Format collection name: capitalize first letters and remove hyphens
  const formatCollectionName = (name: string) => {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getRarityLabel = (score: number) => {
    if (score >= 80) return { label: 'Legendary', color: 'text-purple-400' };
    if (score >= 60) return { label: 'Epic', color: 'text-blue-400' };
    if (score >= 40) return { label: 'Rare', color: 'text-green-400' };
    if (score >= 20) return { label: 'Uncommon', color: 'text-gray-400' };
    return { label: 'Common', color: 'text-gray-500' };
  };

  const copyAddress = async () => {
    if (currentWalletAddress) {
      await navigator.clipboard.writeText(currentWalletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatCastText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#D4AF37] hover:underline"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const extractHandle = (platform: string, url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const handle = pathParts[pathParts.length - 1] || urlObj.hostname;
      return handle.startsWith('@') ? handle : `@${handle}`;
    } catch {
      return url;
    }
  };

  // Helper function to render desktop panel content inline (no overlay header)
  const renderDesktopPanelContent = (panel: 'nfts' | 'social' | 'tokens' | 'activity') => {
    if (panel === 'social') {
      return (
        <div className="h-full overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {web3BioProfile?.links && Object.entries(web3BioProfile.links)
              .filter(([platform, linkData]) => platform.toLowerCase() !== 'website' && platform.toLowerCase() !== 'email' && linkData)
              .map(([platform, linkData]: [string, any]) => {
                const rawUrl = typeof linkData === 'string' ? linkData : linkData?.link;
                if (!rawUrl) return null;

                const normalized = normalizeSocialUrl(platform, rawUrl);
                const finalUrl = normalized.url;

                const WrapEl = finalUrl ? 'a' : 'div';
                const wrapProps = finalUrl ? { href: finalUrl, target: '_blank', rel: 'noreferrer' } : {};

                return (
                  <WrapEl 
                    key={platform} 
                    {...(wrapProps as any)}
                    className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all duration-200 border border-[#D4AF37]/20 hover:border-[#D4AF37]/60 hover:shadow-lg group cursor-pointer"
                  >
                    <div className="w-14 h-14 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <SocialIcon
                        platform={platform}
                        url={rawUrl}
                        size="lg"
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-base text-black dark:text-white font-semibold text-center">
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </span>
                      <span className="text-sm text-black/60 dark:text-white/60 truncate max-w-[140px] text-center">
                        {normalized.displayHandle || extractHandle(platform, rawUrl)}
                      </span>
                    </div>
                  </WrapEl>
                );
              })}
          </div>
        </div>
      );
    }

    if (panel === 'tokens') {
      return (
        <div className="h-full overflow-y-auto px-6 py-3 pb-20">
          {portfolioLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-[#D4AF37]" />
            </div>
          ) : portfolioTokens.length === 0 ? (
            <div className="text-center py-16 text-black/50 dark:text-white/50">
              <p className="text-xl font-medium">No tokens found</p>
              <p className="text-sm mt-2">No fungible tokens in this wallet</p>
            </div>
          ) : (
            <div className="space-y-3 max-w-xl mx-auto">
              {/* Total Value Header */}
              {portfolioTotalValue > 0 && (
                <div className="text-center py-4 mb-4 bg-black/5 dark:bg-white/5 rounded-2xl border border-[#D4AF37]/20">
                  <p className="text-sm text-black/60 dark:text-white/60">Total Portfolio Value</p>
                  <p className="text-3xl font-bold text-[#D4AF37]">
                    ${portfolioTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}
              
              {portfolioTokens.map((token: any, index: number) => (
                <div 
                  key={token.id || `token-${index}`}
                  className="flex items-center gap-4 p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-[#D4AF37]/20 hover:border-[#D4AF37]/40 transition-all hover:shadow-md"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-black/10 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                    {token.icon ? (
                      <img src={token.icon} alt={token.symbol} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-base font-bold text-black dark:text-white">{token.symbol?.slice(0, 2)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-black dark:text-white truncate text-base">
                        {token.chain === 'iota' ? 'IOTA' : token.chain === 'eth' ? 'Ethereum' : token.chain === 'worldchain' ? 'Worldchain' : token.chain === 'base' ? 'Base' : token.chain === 'polygon' ? 'Polygon' : token.chain === 'arbitrum' ? 'Arbitrum' : token.chain === 'optimism' ? 'Optimism' : token.chain === 'hyperevm' ? 'HyperEVM' : (token.chain ? token.chain.charAt(0).toUpperCase() + token.chain.slice(1) : token.name)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-black/50 dark:text-white/50 mt-0.5">
                      <span>{parseFloat(token.quantity || 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} {token.symbol}</span>
                      {token.value > 0 && (
                        <span className="text-[#D4AF37] font-medium">${token.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (panel === 'activity') {
      return (
        <div className="h-full overflow-y-auto px-6 py-3 pb-20">
          {transactionsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-[#D4AF37]" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16 text-black/50 dark:text-white/50">
              <p className="text-xl font-medium">No transactions found</p>
              <p className="text-sm mt-2">Transaction history coming soon</p>
            </div>
          ) : (
            <div className="space-y-3 max-w-xl mx-auto">
              {transactions.map((tx: any, index: number) => (
                <div 
                  key={tx.id || `tx-${index}`}
                  className="flex items-center gap-4 p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-[#D4AF37]/20 hover:border-[#D4AF37]/40 transition-all hover:shadow-md"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${tx.type === 'receive' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    <span className="text-xl font-bold">{tx.type === 'receive' ? '↓' : '↑'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-black dark:text-white truncate capitalize text-base">{tx.type || 'Transaction'}</span>
                      <span className="text-sm text-black/50 dark:text-white/50">
                        {tx.minedAt ? formatDistanceToNow(new Date(tx.minedAt), { addSuffix: true }) : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-black/50 dark:text-white/50 mt-0.5">
                      <span className="truncate font-mono">{tx.hash?.slice(0, 12)}...</span>
                      <div className="flex items-center gap-1.5 bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded">
                        {getChainIcon(tx.chain, 14)}
                        <span className="text-xs uppercase font-medium text-black/70 dark:text-white/70">{tx.chain}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // NFTs panel - reuse existing NFT rendering logic
    return null; // NFTs are handled separately due to complexity
  };

  return (
    <>
      <div className="w-full h-full flex flex-col">
        {/* Profile Section */}
        {activeSection === 'profile' && (
          <div className="flex-1 overflow-y-auto">
            {/* Desktop: 50:50 split layout */}
            {!isMobile ? (
              <div className="fixed inset-0 top-[60px] bottom-[28px] flex flex-col overflow-hidden z-10">
                {/* Full-width Header spanning both sides - with avatar overlay */}
                <div className="relative flex-shrink-0 w-full">
                  <div 
                    className="w-full aspect-[5.5/1] overflow-hidden cursor-pointer"
                    onClick={() => setShowHeaderPopup(true)}
                  >
                    <img
                      src={web3BioProfile?.header || iotaHeaderPattern}
                      alt="Header"
                      className="block w-full h-full object-cover"
                    />
                  </div>
                  {/* Avatar positioned absolutely to overlay header - centered on left half */}
                  <div 
                    className="absolute -bottom-16 left-[25%] transform -translate-x-1/2 z-30 cursor-pointer"
                    onClick={() => setShowAvatarPopup(true)}
                  >
                    <div className="relative group">
                      <Avatar className="h-[136px] w-[136px] border-4 border-white dark:border-black shadow-2xl ring-2 ring-[#D4AF37]/50">
                        <AvatarImage 
                          src={web3BioProfile?.avatar} 
                          alt={web3BioProfile?.displayName || 'User'}
                          className="object-cover"
                        />
                        <AvatarFallback className="text-5xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 text-[#D4AF37] font-bold">
                          {(searchedIdentity?.split('.')[0]?.charAt(0) || web3BioProfile?.displayName?.charAt(0) || '?').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {isHumanVerified && (
                        <div className="absolute -bottom-1 -right-1 w-9 h-9 flex items-center justify-center" title="Verified Builder">
                          <div className="relative">
                            <svg viewBox="0 0 24 24" className="w-9 h-9 drop-shadow-lg">
                              <defs>
                                <linearGradient id="badge-gradient-desktop-header" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#3B82F6" />
                                  <stop offset="100%" stopColor="#1D4ED8" />
                                </linearGradient>
                              </defs>
                              <path d="M12 1L14.5 3.5L18 3L18.5 6.5L21.5 8.5L20 12L21.5 15.5L18.5 17.5L18 21L14.5 20.5L12 23L9.5 20.5L6 21L5.5 17.5L2.5 15.5L4 12L2.5 8.5L5.5 6.5L6 3L9.5 3.5L12 1Z" fill="url(#badge-gradient-desktop-header)" />
                              <path d="M9.5 12.5L11 14L14.5 10.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 50:50 Split Content Area - extends to footer */}
                <div className="flex flex-1 min-h-0">
                  {/* Left side - 50% - Profile info: white in light mode, black+gold gradient in dark */}
                  <div className="w-1/2 flex flex-col min-h-0 border-r border-[#D4AF37]/20 bg-white dark:bg-black">
                    {/* Left panel content - with top padding for avatar overlap */}
                    <div className="flex-1 overflow-y-auto pt-20 pb-28">
                      <div className="px-6 space-y-3">
                      {/* Name */}
                      <h2 className="text-2xl font-bold text-center text-black dark:text-white tracking-tight">
                        {getDisplayName()}
                      </h2>

                      {/* Wallet Address */}
                      {currentWalletAddress && (
                        <div className="flex items-center justify-center">
                          <code 
                            onClick={copyAddress}
                            className="px-3 py-1 bg-black/10 dark:bg-white/10 rounded-lg text-sm text-black/90 dark:text-white/90 cursor-pointer hover:bg-black/20 dark:hover:bg-white/20 transition-colors font-mono"
                          >
                            {copied ? 'Copied!' : shortenAddress(currentWalletAddress)}
                          </code>
                        </div>
                      )}

                      {/* Following/Followers */}
                      {efpStats && (efpStats.following_count > 0 || efpStats.followers_count > 0) && (
                        <div className="flex justify-center items-center gap-2 text-sm">
                          <button onClick={onFollowingClick} className="flex items-center gap-1.5 hover:opacity-80 transition-colors">
                            <span className="font-bold text-[#D4AF37]">{efpStats.following_count || 0}</span>
                            <span className="text-black dark:text-white">Following</span>
                          </button>
                          <span className="text-black/50 dark:text-white/50">·</span>
                          <button onClick={onFollowersClick} className="flex items-center gap-1.5 hover:opacity-80 transition-colors">
                            <span className="font-bold text-[#D4AF37]">{efpStats.followers_count || 0}</span>
                            <span className="text-black dark:text-white">Followers</span>
                          </button>
                        </div>
                      )}

                      {/* Email/Website */}
                      {web3BioProfile && (web3BioProfile?.email || web3BioProfile?.website || web3BioProfile?.url) && (
                        <div className="flex items-center justify-center gap-4 flex-wrap text-sm">
                          {web3BioProfile?.email && (
                            <a href={`mailto:${web3BioProfile.email}`} className="flex items-center gap-1.5 text-black dark:text-[#D4AF37] hover:underline">
                              <Mail className="w-4 h-4 text-black/60 dark:text-white/60" />
                              <span className="truncate max-w-[150px]">{web3BioProfile.email}</span>
                            </a>
                          )}
                          {(web3BioProfile?.website || web3BioProfile?.url) && (
                            <a href={web3BioProfile.website || web3BioProfile.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-black dark:text-[#D4AF37] hover:underline">
                              <Globe className="w-4 h-4 text-black/60 dark:text-white/60" />
                              <span className="truncate max-w-[150px]">{(web3BioProfile.website || web3BioProfile.url)?.replace(/^https?:\/\//, '')}</span>
                            </a>
                          )}
                        </div>
                      )}

                      {/* Bio with label - inline on same row */}
                      {web3BioProfile?.description && (
                        <div className="flex items-start justify-center gap-2 max-w-[380px] mx-auto">
                          <span className="text-sm font-semibold text-foreground flex-shrink-0">Bio:</span>
                          <p className="text-sm text-foreground dark:text-[#D4AF37] leading-relaxed text-left">
                            {web3BioProfile.description}
                          </p>
                        </div>
                      )}
                      {/* Desktop action pills - control right panel */}
                      {(() => {
                        const socialLinks = web3BioProfile?.links 
                          ? Object.entries(web3BioProfile.links).filter(([platform, linkData]) => platform.toLowerCase() !== 'website' && platform.toLowerCase() !== 'email' && linkData)
                          : [];
                        
                        const hasWorldchainNfts = worldchainNftsLoading || worldchainNftCount > 0;
                        const hasNfts = nftLoading || (nfts && nfts.length > 0) || poaps.length > 0 || magicEdenNfts.length > 0 || hasWorldchainNfts || hlNfts.length > 0 || !openseaAttempted || ensDomains.length > 0 || basenames.length > 0;
                        const hasTokens = portfolioTokens.length > 0;
                        const hasSocials = socialLinks.length > 0;
                        const hasTransactions = transactions.length > 0;

                        const buttons: { title: string; panel: 'nfts' | 'social' | 'tokens' | 'activity' }[] = [];
                        if (hasTransactions) buttons.push({ title: 'Activity', panel: 'activity' });
                        if (hasNfts) buttons.push({ title: 'NFTs', panel: 'nfts' });
                        if (hasSocials) buttons.push({ title: 'Social', panel: 'social' });
                        if (hasTokens) buttons.push({ title: 'Tokens', panel: 'tokens' });
                        buttons.sort((a, b) => a.title.localeCompare(b.title));

                        if (buttons.length === 0) return null;

                        return (
                          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                            {buttons.map((btn) => (
                              <button
                                key={btn.title}
                                onClick={() => {
                                  setDesktopActivePanel(btn.panel);
                                  if (btn.panel === 'nfts') onEnsureOpenSeaNfts?.();
                                }}
                                className={`py-2 px-4 rounded-xl border text-sm font-medium whitespace-nowrap transition-all duration-200
                                  ${desktopActivePanel === btn.panel 
                                    ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-md' 
                                    : 'bg-[#D4AF37] border-[#D4AF37] text-black hover:bg-[#C4A030] hover:border-[#C4A030] shadow-sm'
                                  }`}
                              >
                                {btn.title}
                              </button>
                            ))}
                          </div>
                        );
                      })()}

                      {/* On-chain date */}
                      {firstTransactionDate && (
                        <div className="flex items-center justify-center gap-2 text-sm text-black/60 dark:text-white/60 pt-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            On-chain since {new Date(firstTransactionDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric', day: 'numeric' })}
                          </span>
                        </div>
                      )}

                      {/* Credentials Carousel - Talent Protocol & Polymarket */}
                      {(!isIotaProfile || (linkedEvmAddress && hasTalentData)) && (
                        <div className="pt-1">
                          <CredentialsCarousel
                            wallet={currentWalletAddress}
                            ens={searchedIdentity?.includes('.') ? searchedIdentity : undefined}
                            talentScore={talentScore}
                            talentCreatorScore={talentCreatorScore}
                            polymarketWinRate={polymarketWinRate}
                            polymarketProfit={polymarketProfit}
                            hasTalentData={hasTalentData}
                            hasPolymarketData={hasPolymarketData}
                            onTalentClick={() => setShowTalentModal(true)}
                            onPolymarketClick={() => setShowPolymarketModal(true)}
                            baseWidth={300}
                          />
                        </div>
                      )}
                      </div>
                    </div>
                  </div>

                  {/* Right side - 50% - Content panels with themed background - extends to footer */}
                  <div className="w-1/2 flex flex-col min-h-0 bg-white dark:bg-black border-l border-[#D4AF37]/20">
                    {/* Panel header - with back button on left when in subcategory */}
                    <div className="flex-shrink-0 px-6 py-4 bg-black/5 dark:bg-black/50">
                      <div className="relative flex items-center justify-center">
                        {desktopActivePanel === 'nfts' && nftCategory !== 'main' && (
                          <button 
                            onClick={() => { setNftCategory('main'); setExpandedCollection(null); }} 
                            className="absolute left-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] transition-colors"
                          >
                            <ChevronDown className="w-4 h-4 rotate-90" />
                            <span className="text-sm font-medium">Back</span>
                          </button>
                        )}
                        <h3 className="text-xl font-bold text-[#D4AF37] capitalize">
                          {desktopActivePanel === 'nfts' ? 'NFTs' : desktopActivePanel || 'Select a category'}
                        </h3>
                      </div>
                    </div>
                    
                    {/* Panel content */}
                    <div className="flex-1 overflow-y-auto pb-4 min-h-0">
                    {desktopActivePanel === 'social' && renderDesktopPanelContent('social')}
                    {desktopActivePanel === 'tokens' && renderDesktopPanelContent('tokens')}
                    {desktopActivePanel === 'activity' && renderDesktopPanelContent('activity')}
                    {desktopActivePanel === 'nfts' && (
                      /* Desktop NFTs inline panel - reuses existing NFT rendering */
                      <div className="h-full overflow-y-auto px-6 py-3 pb-4">
                        {nftCategory === 'main' ? (
                          <div className="space-y-3 max-w-xl mx-auto">
                            {/* POAPs Button */}
                            {(poaps.length > 0 || poapTotalCount > 0) && (
                              <button onClick={() => setNftCategory('poaps')} className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98]">
                                <div className="flex items-center justify-between h-full">
                                  <div className="text-left flex-1 min-w-0 mr-3">
                                    <h4 className="font-medium text-black text-base">POAPs</h4>
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm text-black/70">{(poapTotalCount || poaps.length).toLocaleString()} {(poapTotalCount || poaps.length) === 1 ? 'badge' : 'badges'}</p>
                                      <div className="flex -space-x-2">
                                        {poaps.slice(0, 3).map((poap, idx) => (
                                          <img key={idx} src={poap.eventImageUrl} alt="" className="w-5 h-5 rounded-full border border-black/20 object-cover" />
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                                </div>
                              </button>
                            )}

                            {/* OpenSea Button - show for IOTA profiles with linked EVM */}
                            {(!isIotaProfile || !!linkedEvmAddress) && ((nfts.length > 0) || (nftLoading && !openseaAttempted)) && (
                              <button onClick={() => setNftCategory('opensea')} className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98]">
                                <div className="flex items-center justify-between h-full">
                                  <div className="text-left flex-1 min-w-0 mr-3">
                                    <h4 className="font-medium text-black text-base">OpenSea</h4>
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm text-black/70">
                                        {nftLoading ? 'Loading…' : nfts.length === 0 && openseaHasErrors ? 'Unavailable' : `${nfts.length} ${nfts.length === 1 ? 'item' : 'items'}`}
                                      </p>
                                    </div>
                                  </div>
                                  <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                                </div>
                              </button>
                            )}

                            {/* Magic Eden Button - show for IOTA profiles with linked EVM */}
                            {(!isIotaProfile || !!linkedEvmAddress) && (magicEdenLoading || magicEdenNfts.length > 0) && (
                              <button onClick={() => setNftCategory('magiceden')} className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98]">
                                <div className="flex items-center justify-between h-full">
                                  <div className="text-left flex-1 min-w-0 mr-3">
                                    <h4 className="font-medium text-black text-base">EVM</h4>
                                    <p className="text-sm text-black/70">{magicEdenLoading ? 'Loading…' : `${magicEdenNfts.length} items`}</p>
                                  </div>
                                  <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                                </div>
                              </button>
                            )}

                            {/* World Chain Button - show for IOTA profiles with linked EVM */}
                            {(!isIotaProfile || !!linkedEvmAddress) && (worldchainNftsLoading || worldchainNftCount > 0) && (
                              <button onClick={() => setNftCategory('worldchain')} className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98]">
                                <div className="flex items-center justify-between h-full">
                                  <div className="text-left flex-1 min-w-0 mr-3">
                                    <h4 className="font-medium text-black text-base">World Chain</h4>
                                    <p className="text-sm text-black/70">{worldchainNftsLoading ? 'Loading…' : `${worldchainNftCount} items`}</p>
                                  </div>
                                  <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                                </div>
                              </button>
                            )}

                            {/* Hyperliquid Button - show for IOTA profiles with linked EVM */}
                            {(!isIotaProfile || !!linkedEvmAddress) && (web3BioProfile?.hlDomain || hlNfts.length > 0) && (
                              <button onClick={() => setNftCategory('hyperliquid')} className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98]">
                                <div className="flex items-center justify-between h-full">
                                  <div className="text-left flex-1 min-w-0 mr-3">
                                    <h4 className="font-medium text-black text-base">Hyperliquid</h4>
                                    <p className="text-sm text-black/70">{hlNfts.length} items</p>
                                  </div>
                                  <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                                </div>
                              </button>
                            )}

                            {/* ENS Domains Button */}
                            {(ensDomainsLoading || ensDomains.length > 0) && !(ensDomainsFetched && ensDomains.length === 0) && (
                              <button onClick={() => setNftCategory('ensdomains')} className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98]">
                                <div className="flex items-center justify-between h-full">
                                  <div className="text-left flex-1 min-w-0 mr-3">
                                    <h4 className="font-medium text-black text-base">ENS Domains</h4>
                                    <p className="text-sm text-black/70">{ensDomainsLoading ? 'Loading…' : `${ensDomains.length} domains`}</p>
                                  </div>
                                  <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                                </div>
                              </button>
                            )}

                            {/* Basenames Button */}
                            {(basenamesLoading || basenames.length > 0) && !(basenamesFetched && basenames.length === 0) && (
                              <button onClick={() => setNftCategory('basenames')} className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#0052FF] to-[#4D8FFF] text-white transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98]">
                                <div className="flex items-center justify-between h-full">
                                  <div className="text-left flex-1 min-w-0 mr-3">
                                    <h4 className="font-medium text-white text-base">Basenames</h4>
                                    <p className="text-sm text-white/70">{basenamesLoading ? 'Loading…' : `${basenames.length} names`}</p>
                                  </div>
                                  <ChevronDown className="w-5 h-5 text-white -rotate-90 flex-shrink-0" />
                                </div>
                              </button>
                            )}

                            {/* IOTA Names Button - only for IOTA profiles */}
                            {isIotaProfile && (iotaLoading || iotaNfts.length > 0) && (
                              <button onClick={() => setNftCategory('iotanames')} className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#00BFA5] to-[#00D9C4] text-white transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98]">
                                <div className="flex items-center justify-between h-full">
                                  <div className="text-left flex-1 min-w-0 mr-3">
                                    <h4 className="font-medium text-white text-base">IOTA Names</h4>
                                    <p className="text-sm text-white/70">{iotaLoading ? 'Loading…' : `${iotaNfts.length} names`}</p>
                                  </div>
                                  <ChevronDown className="w-5 h-5 text-white -rotate-90 flex-shrink-0" />
                                </div>
                              </button>
                            )}

                            {/* Hint for IOTA profiles without linked EVM */}
                            {isIotaProfile && !linkedEvmAddress && !isResolvingLinkedEvm && poaps.length === 0 && nfts.length === 0 && (
                              <div className="text-center py-6 text-muted-foreground">
                                <p className="text-sm">No Ethereum wallet linked to this IOTA ID yet.</p>
                                <p className="text-xs mt-1 opacity-70">Link an ETH wallet via Identity → Link Ethereum Wallet to show POAPs & NFTs.</p>
                              </div>
                            )}

                            {/* Empty state - updated to include IOTA check */}
                            {poaps.length === 0 && nfts.length === 0 && openseaAttempted && !nftLoading && magicEdenNfts.length === 0 && !magicEdenLoading && worldchainNftCount === 0 && !worldchainNftsLoading && hlNfts.length === 0 && ensDomains.length === 0 && ensDomainsFetched && basenames.length === 0 && basenamesFetched && iotaNfts.length === 0 && iotaFetched && !isIotaProfile && (
                              <div className="text-center py-8 text-white/50">
                                <p className="text-sm">No NFTs found for this wallet</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Sub-category views - back button now in header */
                          <div className="space-y-4 max-w-2xl mx-auto">
                            
                            {nftCategory === 'poaps' && <ChronologicalPoapGrid poaps={formattedPoaps} onPoapClick={(poap) => setSelectedPoap(poap)} totalCount={poapTotalCount} hasMore={poapHasMore} onLoadMore={onLoadMorePoaps} isLoadingMore={poapLoadingMore} />}
                            
                            {nftCategory === 'worldchain' && <WorldchainNFTSection walletAddress={currentWalletAddress || ''} />}
                            
                            {nftCategory === 'ensdomains' && (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {ensDomains.map((domain: any) => (
                                  <div key={domain.name} onClick={() => setSelectedEnsDomain(domain)} className="group relative overflow-hidden rounded-xl cursor-pointer border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 transition-all bg-gradient-to-br from-blue-600/20 to-purple-600/20 p-3">
                                    <div className="flex flex-col items-center gap-2">
                                      {domain.avatar ? (
                                        <img src={domain.avatar} alt={domain.name} className="w-12 h-12 rounded-full object-cover" />
                                      ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                                          {domain.name?.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                      <p className="text-foreground text-sm font-medium truncate max-w-full">{domain.name}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {nftCategory === 'basenames' && (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {basenames.map((basename: any) => (
                                  <div key={basename.name} onClick={() => setSelectedBasename(basename)} className="group relative overflow-hidden rounded-xl cursor-pointer border border-[#0052FF]/30 hover:border-[#0052FF]/60 transition-all bg-gradient-to-br from-[#0052FF]/20 to-[#4D8FFF]/20 p-3">
                                    <div className="flex flex-col items-center gap-2">
                                      {basename.avatar ? (
                                        <img src={basename.avatar} alt={basename.name} className="w-12 h-12 rounded-full object-cover" />
                                      ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0052FF] to-[#4D8FFF] flex items-center justify-center text-white font-bold text-lg">
                                          {basename.name?.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                      <p className="text-foreground text-sm font-medium truncate max-w-full">{basename.name}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* IOTA Names Grid */}
                            {nftCategory === 'iotanames' && (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {iotaNfts.map((iotaName: any, index: number) => (
                                  <div key={iotaName.name || index} className="group relative overflow-hidden rounded-xl cursor-pointer border border-[#00BFA5]/30 hover:border-[#00BFA5]/60 transition-all bg-gradient-to-br from-[#00BFA5]/20 to-[#00D9C4]/20 p-3">
                                    <div className="flex flex-col items-center gap-2">
                                      {iotaName.imageUrl ? (
                                        <img src={iotaName.imageUrl} alt={iotaName.name} className="w-12 h-12 rounded-full object-cover" />
                                      ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00BFA5] to-[#00D9C4] flex items-center justify-center text-white font-bold text-lg">
                                          {iotaName.name?.charAt(0).toUpperCase() || 'I'}
                                        </div>
                                      )}
                                      <p className="text-foreground text-sm font-medium truncate max-w-full">{iotaName.name || 'IOTA Name'}</p>
                                      {iotaName.collection && (
                                        <p className="text-foreground/60 text-xs truncate max-w-full">{iotaName.collection}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {iotaNfts.length === 0 && iotaFetched && (
                                  <div className="col-span-full text-center py-8 text-white/50">
                                    <p className="text-sm">No IOTA Names found</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {nftCategory === 'opensea' && (
                              expandedCollection ? (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {openSeaGroupedNfts[expandedCollection]?.map((nft: any, index: number) => (
                                      <div key={`${nft.contract}-${nft.identifier}-${index}`} className="group relative overflow-hidden rounded-xl cursor-pointer border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 transition-all" onClick={() => setSelectedNft(nft)}>
                                        <img src={nft.image_url || nft.display_image_url} alt={nft.name} className="w-full aspect-square object-cover" />
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                          <p className="text-white text-xs font-medium truncate">{nft.name}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {Object.entries(openSeaGroupedNfts).map(([collection, collectionNfts]: [string, any[]]) => (
                                    <button key={collection} onClick={() => setExpandedCollection(collection)} className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98]">
                                      <div className="flex items-center justify-between h-full">
                                        <div className="text-left flex-1 min-w-0 mr-3">
                                          <h4 className="font-medium text-black text-base truncate">{formatCollectionName(collection)}</h4>
                                          <p className="text-sm text-black/70">{collectionNfts.length} items</p>
                                        </div>
                                        <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )
                            )}

                            {nftCategory === 'magiceden' && (
                              expandedCollection ? (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {magicEdenGroupedNfts[expandedCollection]?.map((nft: any, index: number) => (
                                      <div key={`${nft.contract}-${nft.identifier}-${index}`} className="group relative overflow-hidden rounded-xl cursor-pointer border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 transition-all" onClick={() => setSelectedNft(nft)}>
                                        <img src={nft.image_url || nft.display_image_url} alt={nft.name} className="w-full aspect-square object-cover" />
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                          <p className="text-white text-xs font-medium truncate">{nft.name}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {Object.entries(magicEdenGroupedNfts).map(([collection, collectionNfts]: [string, any[]]) => (
                                    <button key={collection} onClick={() => setExpandedCollection(collection)} className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98]">
                                      <div className="flex items-center justify-between h-full">
                                        <div className="text-left flex-1 min-w-0 mr-3">
                                          <h4 className="font-medium text-black text-base truncate">{formatCollectionName(collection)}</h4>
                                          <p className="text-sm text-black/70">{collectionNfts.length} items</p>
                                        </div>
                                        <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )
                            )}

                            {nftCategory === 'hyperliquid' && (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {hlNfts.map((nft: any, index: number) => (
                                  <div key={`hl-${index}`} className="group relative overflow-hidden rounded-xl cursor-pointer border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 transition-all" onClick={() => setSelectedNft(nft)}>
                                    <img src={nft.image_url || nft.display_image_url} alt={nft.name} className="w-full aspect-square object-cover" />
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                      <p className="text-white text-xs font-medium truncate">{nft.name}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {!desktopActivePanel && (
                      <div className="flex flex-col items-center justify-center h-full text-black/50 dark:text-white/50 gap-2">
                        <div className="text-lg font-medium">No Onchain Data</div>
                        <p className="text-sm">No social links, tokens, activity, or NFTs found for this address.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            ) : (
              /* Mobile: Original stacked layout - black with gold gradient in dark mode */
              <div className="space-y-2 pb-20 bg-background min-h-full">
                {/* Header and Avatar with Verified Badge - Always visible */}
                <div className="relative flex-shrink-0">
                  <div 
                    className="w-full aspect-[3.3/1] lg:aspect-[5.5/1] overflow-hidden cursor-pointer"
                    onClick={() => setShowHeaderPopup(true)}
                  >
                    <img
                      src={web3BioProfile?.header || iotaHeaderPattern}
                      alt="Header"
                      className="block w-full h-full object-cover"
                    />
                    {/* No gradient overlay – matches desktop */}
                  </div>

                  <div className="flex justify-center absolute -bottom-16 left-0 right-0">
                    <div className="relative group cursor-pointer" onClick={() => setShowAvatarPopup(true)}>
                      {/* No glow ring – matches desktop */}
                      <Avatar className="relative h-32 w-32 border-[3px] border-background shadow-2xl ring-2 ring-primary/20">
                        <AvatarImage 
                          src={web3BioProfile?.avatar} 
                          alt={web3BioProfile?.displayName || 'User'}
                          className="object-cover"
                        />
                        <AvatarFallback className="text-5xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 text-[#D4AF37] font-bold">
                          {(searchedIdentity?.split('.')[0]?.charAt(0) || web3BioProfile?.displayName?.charAt(0) || '?').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {/* Verified Badge - Only show when user has human verification */}
                      {isHumanVerified && (
                        <div
                          className="absolute -bottom-1 -right-1 w-10 h-10 flex items-center justify-center"
                          title="Verified Builder"
                        >
                          <div className="relative">
                            <svg viewBox="0 0 24 24" className="w-10 h-10 drop-shadow-lg">
                              <defs>
                                <linearGradient id="badge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#3B82F6" />
                                  <stop offset="100%" stopColor="#1D4ED8" />
                                </linearGradient>
                              </defs>
                              <path 
                                d="M12 1L14.5 3.5L18 3L18.5 6.5L21.5 8.5L20 12L21.5 15.5L18.5 17.5L18 21L14.5 20.5L12 23L9.5 20.5L6 21L5.5 17.5L2.5 15.5L4 12L2.5 8.5L5.5 6.5L6 3L9.5 3.5L12 1Z" 
                                fill="url(#badge-gradient)" 
                              />
                              <path 
                                d="M9.5 12.5L11 14L14.5 10.5" 
                                stroke="white" 
                                strokeWidth="2" 
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill="none"
                              />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-[68px] space-y-2 flex-shrink-0">

                  {/* Display name with refined typography */}
                  <h2 className="text-2xl font-bold text-center text-foreground tracking-tight">
                    {getDisplayName()}
                  </h2>

                  {currentWalletAddress && (
                    <div className="flex items-center justify-center">
                      <code 
                        onClick={copyAddress}
                        className="px-3 py-1 bg-muted rounded-md text-sm text-black dark:text-white cursor-pointer hover:bg-muted/80 transition-colors"
                      >
                        {copied ? 'Copied' : shortenAddress(currentWalletAddress)}
                      </code>
                    </div>
                  )}


                  {/* Following/Followers - Only render container if EFP stats exist with counts > 0 */}
                  {efpStats && (efpStats.following_count > 0 || efpStats.followers_count > 0) && (
                    <div className="flex justify-center items-center gap-1.5 text-sm">
                      <button
                        onClick={onFollowingClick}
                        className="flex items-center gap-1 hover:opacity-80 transition-colors"
                      >
                        <span className="font-semibold text-[#D4AF37]">{efpStats.following_count || 0}</span>
                        <span className="text-black dark:text-white">Following</span>
                      </button>
                      <span className="text-black dark:text-white">·</span>
                      <button
                        onClick={onFollowersClick}
                        className="flex items-center gap-1 hover:opacity-80 transition-colors"
                      >
                        <span className="font-semibold text-[#D4AF37]">{efpStats.followers_count || 0}</span>
                        <span className="text-black dark:text-white">Followers</span>
                      </button>
                    </div>
                  )}

                  {/* Email/Website/Bio - Only show if user has email, website, or bio */}
                  {web3BioProfile && (web3BioProfile?.email || web3BioProfile?.website || web3BioProfile?.url || web3BioProfile?.description) && (
                    <div className="flex flex-col items-center gap-1.5">
                      {/* Email and Website row */}
                      {(web3BioProfile?.email || web3BioProfile?.website || web3BioProfile?.url) && (
                        <div className="flex items-center justify-center gap-4 flex-wrap">
                          {web3BioProfile?.email && (
                            <a 
                              href={`mailto:${web3BioProfile.email}`} 
                              className="flex items-center gap-2 text-sm text-black dark:text-[#D4AF37] hover:underline"
                            >
                              <Mail className="w-4 h-4 text-black dark:text-white" />
                              {web3BioProfile.email}
                            </a>
                          )}
                          
                          {(web3BioProfile?.website || web3BioProfile?.url) && (
                            <a
                              href={web3BioProfile.website || web3BioProfile.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-black dark:text-[#D4AF37] hover:underline"
                            >
                              <Globe className="w-4 h-4 text-black dark:text-white" />
                              <span>{(web3BioProfile.website || web3BioProfile.url)?.replace(/^https?:\/\//, '')}</span>
                            </a>
                          )}
                        </div>
                      )}
                      
                      {/* Bio ticker row - same width as pills */}
                      {web3BioProfile?.description && (
                        <BioTicker bio={web3BioProfile.description} />
                      )}
                    </div>
                  )}

                  {/* Profile Action Pills - Horizontal Layout (Mobile) */}
                  {(() => {
                    const socialLinks = web3BioProfile?.links 
                      ? Object.entries(web3BioProfile.links)
                          .filter(([platform, linkData]) => platform.toLowerCase() !== 'website' && platform.toLowerCase() !== 'email' && linkData)
                      : [];
                    
                    const hasWorldchainNfts = worldchainNftsLoading || worldchainNftCount > 0;
                    // NFTs button shows if any NFT source has data OR if any NFT source is still loading
                    // Also show if OpenSea hasn't been attempted yet (data might come when overlay opens)
                    const hasNfts = nftLoading || (nfts && nfts.length > 0) || poaps.length > 0 || magicEdenNfts.length > 0 || hasWorldchainNfts || hlNfts.length > 0 || !openseaAttempted;
                    const hasTokens = portfolioTokens.length > 0;
                    const hasSocials = socialLinks.length > 0;
                    const hasTransactions = transactions.length > 0;

                    // Build buttons array
                    const buttons: { title: string; onClick: () => void }[] = [];
                    
                    if (hasTransactions) {
                      buttons.push({ title: 'Activity', onClick: () => setShowActivityOverlay(true) });
                    }
                    if (hasNfts) {
                      buttons.push({ 
                        title: 'NFTs', 
                        onClick: () => {
                          setShowNftsOverlay(true);
                          // Trigger OpenSea fetch when overlay opens
                          onEnsureOpenSeaNfts?.();
                        }
                      });
                    }
                    if (hasSocials) {
                      buttons.push({ title: 'Social', onClick: () => setShowAllSocials(true) });
                    }
                    if (hasTokens) {
                      buttons.push({ title: 'Tokens', onClick: () => setShowTokensOverlay(true) });
                    }

                    // Sort alphabetically
                    buttons.sort((a, b) => a.title.localeCompare(b.title));

                    if (buttons.length === 0) return null;

                    return (
                      <div className="flex items-center justify-center gap-2 px-4">
                        {buttons.map((btn) => (
                          <button
                            key={btn.title}
                            onClick={btn.onClick}
                            className="flex-1 max-w-[85px] py-2 px-3 rounded-xl bg-[#D4AF37] border border-[#D4AF37] hover:bg-[#C4A030] hover:border-[#C4A030] active:scale-95 transition-all duration-200 text-sm font-medium text-black whitespace-nowrap shadow-sm"
                          >
                            {btn.title}
                          </button>
                        ))}
                      </div>
                    );
                  })()}

                  {/* On-chain date - Always render with fixed height */}
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground min-h-[24px]">
                    {firstTransactionDate ? (
                      <>
                        <Calendar className="w-4 h-4" />
                        <span>
                          On-chain since {new Date(firstTransactionDate).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                            day: 'numeric' 
                          })}
                        </span>
                      </>
                    ) : null}
                  </div>

                  {/* Credentials Carousel - Talent Protocol & Polymarket */}
                  {(!isIotaProfile || (linkedEvmAddress && hasTalentData)) && (
                  <div className="-mt-3">
                    <CredentialsCarousel
                      wallet={currentWalletAddress}
                      ens={searchedIdentity?.includes('.') ? searchedIdentity : undefined}
                      talentScore={talentScore}
                      talentCreatorScore={talentCreatorScore}
                      polymarketWinRate={polymarketWinRate}
                      polymarketProfit={polymarketProfit}
                      hasTalentData={hasTalentData}
                      hasPolymarketData={hasPolymarketData}
                      onTalentClick={() => setShowTalentModal(true)}
                      onPolymarketClick={() => setShowPolymarketModal(true)}
                      baseWidth={340}
                    />
                  </div>
                  )}
                </div>
              </div>
            )}

            {/* Flip Card for All Social Links */}
            {showAllSocials && isMobile && (
              <div className="fixed left-0 right-0 bg-background dark:bg-black z-[9998] animate-fade-in flex flex-col" style={{ backfaceVisibility: 'hidden', top: 'calc(env(safe-area-inset-top, 0px) + 64px)', bottom: 0 }}>
                {/* Header with ENS image banner */}
                <div 
                  className="relative w-full h-20 bg-cover bg-center flex-shrink-0 overflow-hidden"
                  style={{ 
                    backgroundImage: `url(${web3BioProfile?.header || iotaHeaderPattern})`
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 dark:to-background/90" />
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2">
                    <div className="w-10" />
                    <div className="px-4 py-1.5 rounded-full bg-background/80 backdrop-blur-sm">
                      <h3 className="text-lg font-bold text-black dark:text-white">Social Links</h3>
                    </div>
                    <button
                      onClick={() => setShowAllSocials(false)}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-background/80 hover:bg-background dark:bg-[#D4AF37] dark:hover:bg-[#B8860B] transition-all backdrop-blur-sm"
                    >
                      <X className="w-4 h-4 text-black" />
                    </button>
                  </div>
                </div>

                {/* Social Icons Grid */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                    {web3BioProfile?.links && Object.entries(web3BioProfile.links)
                      .filter(([platform, linkData]) => platform.toLowerCase() !== 'website' && platform.toLowerCase() !== 'email' && linkData)
                      .map(([platform, linkData]: [string, any]) => {
                        const rawUrl = typeof linkData === 'string' ? linkData : linkData?.link;
                        if (!rawUrl) return null;

                        const normalized = normalizeSocialUrl(platform, rawUrl);
                        const finalUrl = normalized.url;
                        const WrapEl = finalUrl ? 'a' : 'div';
                        const wrapProps = finalUrl ? { href: finalUrl, target: '_blank', rel: 'noreferrer' } : {};

                        return (
                          <WrapEl 
                            key={platform} 
                            {...(wrapProps as any)}
                            className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-all border border-border/30 hover:border-[#D4AF37]/50 cursor-pointer"
                          >
                            <SocialIcon
                              platform={platform}
                              url={rawUrl}
                              size="lg"
                            />
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-sm text-foreground font-medium text-center">
                                {platform.charAt(0).toUpperCase() + platform.slice(1)}
                              </span>
                              <span className="text-xs text-muted-foreground truncate max-w-[100px] text-center">
                                {normalized.isDiscordUsername ? normalized.displayHandle : normalized.displayHandle || extractHandle(platform, rawUrl)}
                              </span>
                            </div>
                          </WrapEl>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {/* NFTs Overlay - Fits within gold borders */}
            {showNftsOverlay && (
              <div className="fixed left-0 right-0 bg-background dark:bg-black z-[9998] animate-fade-in flex flex-col" style={{ backfaceVisibility: 'hidden', top: 'calc(env(safe-area-inset-top, 0px) + 64px)', bottom: 0 }}>
                {/* Header with ENS image banner */}
                <div 
                  className="relative w-full h-20 bg-cover bg-center flex-shrink-0 overflow-hidden"
                  style={{ 
                    backgroundImage: `url(${web3BioProfile?.header || iotaHeaderPattern})`
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 dark:to-background/90" />
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2">
                    <div className="w-10" />
                    <div className="px-4 py-1.5 rounded-full bg-background/80 backdrop-blur-sm flex items-center gap-2">
                      <h3 className="text-lg font-bold text-black dark:text-white">
                        {nftCategory === 'main'
                          ? 'NFTs'
                          : nftCategory === 'poaps'
                            ? 'POAPs'
                            : nftCategory === 'opensea'
                              ? 'OpenSea'
                              : nftCategory === 'magiceden'
                                ? 'EVM'
                                : nftCategory === 'worldchain'
                                  ? 'World Chain'
                                  : nftCategory === 'ensdomains'
                                    ? 'ENS Domains'
                                    : nftCategory === 'basenames'
                                      ? 'Basenames'
                                      : nftCategory === 'iotanames'
                                        ? 'IOTA Names'
                                        : 'Hyperliquid'}
                      </h3>
                      {nftCategory === 'poaps' && formattedPoaps.length > 0 && (
                        <span className="text-sm font-medium text-purple-500">
                          {formattedPoaps.length}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (nftCategory !== 'main' && !expandedCollection) {
                          setNftCategory('main');
                        } else if (expandedCollection) {
                          setExpandedCollection(null);
                        } else {
                          setShowNftsOverlay(false);
                          setNftCategory('main');
                        }
                      }}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-background/80 hover:bg-background dark:bg-[#D4AF37] dark:hover:bg-[#B8860B] transition-all backdrop-blur-sm"
                    >
                      <X className="w-4 h-4 text-black" />
                    </button>
                  </div>
                </div>

                {/* NFTs Content */}
                <div className="flex-1 overflow-y-auto px-4 py-3 pb-24">
                  {nftCategory === 'main' ? (
                    // Main category selection
                    <div className="space-y-2 max-w-lg mx-auto">
                      {/* POAPs Button - Only show if has items */}
                      {(poaps.length > 0 || poapTotalCount > 0) && (
                        <button
                          onClick={() => setNftCategory('poaps')}
                          className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] touch-action-manipulation"
                        >
                          <div className="flex items-center justify-between h-full">
                            <div className="text-left flex-1 min-w-0 mr-3">
                              <h4 className="font-medium text-black text-base">POAPs</h4>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-black/70">{(poapTotalCount || poaps.length).toLocaleString()} {(poapTotalCount || poaps.length) === 1 ? 'item' : 'items'}</p>
                                <div className="flex -space-x-2">
                                  {poaps.slice(0, 3).map((poap, idx) => (
                                    <img key={idx} src={poap.eventImageUrl} alt="" className="w-5 h-5 rounded-full border border-black/20 object-cover" />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                          </div>
                        </button>
                      )}

                      {/* OpenSea Button - show for IOTA profiles with linked EVM */}
                      {(!isIotaProfile || !!linkedEvmAddress) && (nftLoading || nfts.length > 0 || !openseaAttempted) && (
                        <button
                          onClick={() => {
                            setNftCategory('opensea');
                            onEnsureOpenSeaNfts?.();
                          }}
                          className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] touch-action-manipulation"
                        >
                          <div className="flex items-center justify-between h-full">
                            <div className="text-left flex-1 min-w-0 mr-3">
                              <h4 className="font-medium text-black text-base">OpenSea</h4>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-black/70">
                                  {nftLoading ? 'Loading…' : openseaHasErrors && nfts.length === 0 ? 'Unavailable' : `${nfts.length} ${nfts.length === 1 ? 'item' : 'items'}`}
                                </p>
                                {nfts.length > 0 && (
                                  <div className="flex -space-x-2">
                                    {nfts.slice(0, 3).map((nft, idx) => (
                                      <img key={idx} src={nft.image_url || nft.display_image_url} alt="" className="w-5 h-5 rounded-full border border-black/20 object-cover" />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                          </div>
                        </button>
                      )}

                      {/* Hide OpenSea button if attempted, no items, and no errors */}
                      {openseaAttempted && nfts.length === 0 && !openseaHasErrors && !nftLoading && null}

                      {/* Magic Eden (EVM) Button - show for IOTA profiles with linked EVM */}
                      {(!isIotaProfile || !!linkedEvmAddress) && (magicEdenLoading || magicEdenNfts.length > 0) && (
                        <button
                          onClick={() => setNftCategory('magiceden')}
                          className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] touch-action-manipulation"
                        >
                          <div className="flex items-center justify-between h-full">
                            <div className="text-left flex-1 min-w-0 mr-3">
                              <h4 className="font-medium text-black text-base">EVM</h4>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-black/70">
                                  {magicEdenLoading ? 'Loading…' : `${magicEdenNfts.length} ${magicEdenNfts.length === 1 ? 'item' : 'items'}`}
                                </p>
                                {magicEdenNfts.length > 0 && (
                                  <div className="flex -space-x-2">
                                    {magicEdenNfts.slice(0, 3).map((nft, idx) => (
                                      <img key={idx} src={nft.image_url || nft.display_image_url} alt="" className="w-5 h-5 rounded-full border border-black/20 object-cover" />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                          </div>
                        </button>
                      )}

                      {/* World Chain Button - show for IOTA profiles with linked EVM */}
                      {(!isIotaProfile || !!linkedEvmAddress) && (worldchainNftsLoading || worldchainNftCount > 0) && (
                        <button
                          onClick={() => setNftCategory('worldchain')}
                          className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] touch-action-manipulation"
                        >
                          <div className="flex items-center justify-between h-full">
                            <div className="text-left flex-1 min-w-0 mr-3">
                              <h4 className="font-medium text-black text-base">World Chain</h4>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-black/70">
                                  {worldchainNftsLoading ? 'Loading…' : `${worldchainNftCount} ${worldchainNftCount === 1 ? 'item' : 'items'}`}
                                </p>
                                {!worldchainNftsLoading && worldchainCollections.length > 0 && (
                                  <div className="flex -space-x-2">
                                    {worldchainCollections.slice(0, 3).map((c, idx) => (
                                      <img
                                        key={idx}
                                        src={c.coverImage}
                                        alt=""
                                        className="w-5 h-5 rounded-full border border-black/20 object-cover"
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                          </div>
                        </button>
                      )}

                      {/* Hyperliquid Button - Only show if .hl domain or has HL NFTs - hide for IOTA */}
                      {!isIotaProfile && (web3BioProfile?.hlDomain || hlNfts.length > 0) && (
                        <button
                          onClick={() => setNftCategory('hyperliquid')}
                          className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] touch-action-manipulation"
                        >
                          <div className="flex items-center justify-between h-full">
                            <div className="text-left flex-1 min-w-0 mr-3">
                              <h4 className="font-medium text-black text-base">Hyperliquid</h4>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-black/70">{hlNfts.length} {hlNfts.length === 1 ? 'item' : 'items'}</p>
                                {hlNfts.length > 0 && (
                                  <div className="flex -space-x-2">
                                    {hlNfts.slice(0, 3).map((nft, idx) => (
                                      <img key={idx} src={nft.image_url || nft.display_image_url} alt="" className="w-5 h-5 rounded-full border border-black/20 object-cover" />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                          </div>
                        </button>
                      )}

                      {/* ENS Domains Button - Show while loading OR if has domains after fetch */}
                      {(ensDomainsLoading || ensDomains.length > 0) && !(ensDomainsFetched && ensDomains.length === 0) && (
                        <button
                          onClick={() => setNftCategory('ensdomains')}
                          className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] touch-action-manipulation"
                        >
                          <div className="flex items-center justify-between h-full">
                            <div className="text-left flex-1 min-w-0 mr-3">
                              <h4 className="font-medium text-black text-base">ENS Domains</h4>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-black/70">
                                  {ensDomainsLoading ? 'Loading…' : `${ensDomains.length} ${ensDomains.length === 1 ? 'domain' : 'domains'}`}
                                </p>
                              </div>
                            </div>
                            <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                          </div>
                        </button>
                      )}

                      {/* Basenames Button - Show while loading OR if has basenames after fetch */}
                      {(basenamesLoading || basenames.length > 0) && !(basenamesFetched && basenames.length === 0) && (
                        <button
                          onClick={() => setNftCategory('basenames')}
                          className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#0052FF] to-[#4D8FFF] text-white transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] touch-action-manipulation"
                        >
                          <div className="flex items-center justify-between h-full">
                            <div className="text-left flex-1 min-w-0 mr-3">
                              <h4 className="font-medium text-white text-base">Basenames</h4>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-white/70">
                                  {basenamesLoading ? 'Loading…' : `${basenames.length} ${basenames.length === 1 ? 'name' : 'names'}`}
                                </p>
                              </div>
                            </div>
                            <ChevronDown className="w-5 h-5 text-white -rotate-90 flex-shrink-0" />
                          </div>
                        </button>
                      )}

                      {/* IOTA Names Button - only for IOTA profiles */}
                      {isIotaProfile && (iotaLoading || iotaNfts.length > 0) && (
                        <button
                          onClick={() => setNftCategory('iotanames')}
                          className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#00BFA5] to-[#00D9C4] text-white transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] touch-action-manipulation"
                        >
                          <div className="flex items-center justify-between h-full">
                            <div className="text-left flex-1 min-w-0 mr-3">
                              <h4 className="font-medium text-white text-base">IOTA Names</h4>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-white/70">
                                  {iotaLoading ? 'Loading…' : `${iotaNfts.length} ${iotaNfts.length === 1 ? 'name' : 'names'}`}
                                </p>
                              </div>
                            </div>
                            <ChevronDown className="w-5 h-5 text-white -rotate-90 flex-shrink-0" />
                          </div>
                        </button>
                      )}

                      {/* Empty state placeholder when no categories available - include IOTA check */}
                      {poaps.length === 0 && 
                       nfts.length === 0 && 
                       openseaAttempted && 
                       !nftLoading && 
                       magicEdenNfts.length === 0 && 
                       !magicEdenLoading &&
                       worldchainNftCount === 0 &&
                       !worldchainNftsLoading &&
                       hlNfts.length === 0 &&
                       ensDomains.length === 0 &&
                       ensDomainsFetched &&
                       basenames.length === 0 &&
                       basenamesFetched &&
                       iotaNfts.length === 0 &&
                       iotaFetched && (
                        <div className="text-center py-8 text-muted-foreground">
                          <p className="text-sm">No NFTs found for this wallet</p>
                        </div>
                      )}

                      {/* Loading skeleton when fetching */}
                      {(nftLoading || magicEdenLoading || worldchainNftsLoading || ensDomainsLoading || basenamesLoading) && 
                       poaps.length === 0 && 
                       nfts.length === 0 && 
                       magicEdenNfts.length === 0 &&
                       worldchainNftCount === 0 &&
                       ensDomains.length === 0 &&
                       basenames.length === 0 && (
                        <div className="space-y-2">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="w-full h-16 rounded-2xl bg-muted/40 animate-pulse" />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : nftCategory === 'poaps' ? (
                    // POAPs chronological grid
                    <ChronologicalPoapGrid 
                      poaps={formattedPoaps} 
                      onPoapClick={(poap) => setSelectedPoap(poap)}
                      totalCount={poapTotalCount}
                      hasMore={poapHasMore}
                      onLoadMore={onLoadMorePoaps}
                      isLoadingMore={poapLoadingMore}
                    />
                  ) : nftCategory === 'opensea' ? (
                    // OpenSea collections
                    expandedCollection ? (
                      <div className="space-y-4 max-w-2xl mx-auto">
                        <div className="sticky -top-3 z-10 bg-background dark:bg-black -mx-4 px-4 pt-3 pb-3">
                          <div className="flex items-center gap-3 pb-3 border-b border-[#D4AF37]/30">
                            <button onClick={() => setExpandedCollection(null)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] transition-colors">
                              <ChevronDown className="w-4 h-4 rotate-90" />
                              <span className="text-sm font-medium">Back</span>
                            </button>
                            <div className="flex-1">
                              <h4 className="font-bold text-[#D4AF37] text-lg truncate">{formatCollectionName(expandedCollection)}</h4>
                              <p className="text-sm text-muted-foreground">{openSeaGroupedNfts[expandedCollection]?.length || 0} items</p>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 justify-items-center">
                          {openSeaGroupedNfts[expandedCollection]?.map((nft: any, index: number) => {
                            const animationUrl = nft.animation_url || nft.metadata?.animation_url;
                            const isVideo = animationUrl && (animationUrl.toLowerCase().includes('.mp4') || animationUrl.toLowerCase().includes('.webm') || animationUrl.toLowerCase().includes('video'));
                            const isAudio = animationUrl && (animationUrl.toLowerCase().includes('.mp3') || animationUrl.toLowerCase().includes('.wav') || animationUrl.toLowerCase().includes('audio'));
                            return (
                              <div key={`${nft.contract}-${nft.identifier}-${index}`} className="group relative overflow-hidden rounded-xl cursor-pointer border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 transition-all" onClick={() => setSelectedNft(nft)}>
                                {isVideo ? (
                                  <video src={animationUrl} poster={nft.image_url || nft.display_image_url} muted loop playsInline onMouseEnter={(e) => e.currentTarget.play()} onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }} className="w-full aspect-square object-cover" />
                                ) : (
                                  <img src={nft.image_url || nft.display_image_url} alt={nft.name} className="w-full aspect-square object-cover" />
                                )}
                                {nft.quantity && nft.quantity > 1 && <div className="absolute top-2 right-2 bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">x{nft.quantity}</div>}
                                {(isVideo || isAudio) && <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">{isVideo ? '▶' : '♪'}</div>}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                  <p className="text-white text-xs font-medium truncate">{nft.name}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 max-w-lg mx-auto">
                        {Object.entries(openSeaGroupedNfts).map(([collection, collectionNfts]: [string, any[]]) => (
                          <button key={collection} onClick={() => setExpandedCollection(collection)} className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] touch-action-manipulation">
                            <div className="flex items-center justify-between h-full">
                              <div className="text-left flex-1 min-w-0 mr-3">
                                <h4 className="font-medium text-black text-base truncate">{formatCollectionName(collection)}</h4>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm text-black/70">{collectionNfts.length} {collectionNfts.length === 1 ? 'item' : 'items'}</p>
                                  <div className="flex -space-x-2">
                                    {collectionNfts.slice(0, 3).map((nft: any, idx: number) => (
                                      <img key={idx} src={nft.image_url || nft.display_image_url} alt="" className="w-5 h-5 rounded-full border border-black/20 object-cover" />
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                            </div>
                          </button>
                        ))}
                        {web3BioProfile?.address && (
                          <Button asChild className="w-full bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 mt-3">
                            <a href={`https://opensea.io/${web3BioProfile.address}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-2" />View On OpenSea
                            </a>
                          </Button>
                        )}
                      </div>
                    )
                  ) : nftCategory === 'magiceden' ? (
                    // Magic Eden collections
                    magicEdenLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                      </div>
                    ) : expandedCollection ? (
                      <div className="space-y-4 max-w-2xl mx-auto">
                        <div className="sticky -top-3 z-10 bg-background dark:bg-black -mx-4 px-4 pt-3 pb-3">
                          <div className="flex items-center gap-3 pb-3 border-b border-[#D4AF37]/30">
                            <button onClick={() => setExpandedCollection(null)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] transition-colors">
                              <ChevronDown className="w-4 h-4 rotate-90" />
                              <span className="text-sm font-medium">Back</span>
                            </button>
                            <div className="flex-1">
                              <h4 className="font-bold text-[#D4AF37] text-lg truncate">{formatCollectionName(expandedCollection)}</h4>
                              <p className="text-sm text-muted-foreground">{magicEdenGroupedNfts[expandedCollection]?.length || 0} items</p>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 justify-items-center">
                          {magicEdenGroupedNfts[expandedCollection]?.map((nft: any, index: number) => (
                            <div key={`${nft.contract}-${nft.identifier}-${index}`} className="group relative overflow-hidden rounded-xl cursor-pointer border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 transition-all" onClick={() => setSelectedNft(nft)}>
                              <img src={nft.image_url || nft.display_image_url} alt={nft.name} className="w-full aspect-square object-cover" />
                              {nft.quantity && nft.quantity > 1 && <div className="absolute top-2 right-2 bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">x{nft.quantity}</div>}
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                <p className="text-white text-xs font-medium truncate">{nft.name}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : magicEdenNfts.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <p>No Magic Eden NFTs found</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-w-lg mx-auto">
                        {Object.entries(magicEdenGroupedNfts).map(([collection, collectionNfts]: [string, any[]]) => (
                          <button key={collection} onClick={() => setExpandedCollection(collection)} className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] touch-action-manipulation">
                            <div className="flex items-center justify-between h-full">
                              <div className="text-left flex-1 min-w-0 mr-3">
                                <h4 className="font-medium text-black text-base truncate">{formatCollectionName(collection)}</h4>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm text-black/70">{collectionNfts.length} {collectionNfts.length === 1 ? 'item' : 'items'}</p>
                                  <div className="flex -space-x-2">
                                    {collectionNfts.slice(0, 3).map((nft: any, idx: number) => (
                                      <img key={idx} src={nft.image_url || nft.display_image_url} alt="" className="w-5 h-5 rounded-full border border-black/20 object-cover" />
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                            </div>
                          </button>
                        ))}
                        {web3BioProfile?.address && (
                          <Button asChild className="w-full bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 mt-3">
                            <a href={`https://magiceden.io/portfolio/${web3BioProfile.address}?chain=worldchain`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-2" />View On Magic Eden
                            </a>
                          </Button>
                        )}
                      </div>
                    )
                  ) : nftCategory === 'worldchain' ? (
                    <div className="max-w-3xl mx-auto pt-2">
                      <WorldchainNFTSection walletAddress={web3BioProfile?.address} />
                    </div>
                  ) : nftCategory === 'hyperliquid' ? (
                    // Hyperliquid NFTs
                    hlLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                      </div>
                    ) : hlNfts.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <p>No Hyperliquid NFTs found</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-w-2xl mx-auto">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 justify-items-center">
                          {hlNfts.map((nft: any, index: number) => (
                            <div key={`hl-${nft.identifier || nft.contract}-${index}`} className="group relative overflow-hidden rounded-xl cursor-pointer border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 transition-all" onClick={() => setSelectedNft(nft)}>
                              <img src={nft.image_url || nft.display_image_url} alt={nft.name} className="w-full aspect-square object-cover" />
                              {nft.quantity && nft.quantity > 1 && <div className="absolute top-2 right-2 bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">x{nft.quantity}</div>}
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                <p className="text-white text-xs font-medium truncate">{nft.name}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ) : nftCategory === 'ensdomains' ? (
                    // ENS Domains - Grid layout with avatars
                    ensDomainsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                      </div>
                    ) : ensDomains.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <p>No ENS domains found</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-w-2xl mx-auto">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 justify-items-center">
                          {ensDomains.map((domain: any, index: number) => (
                            <div
                              key={`ens-${domain.name}-${index}`}
                              className="group relative overflow-hidden rounded-xl cursor-pointer border border-[#5298FF]/20 hover:border-[#5298FF]/50 transition-all w-full"
                              onClick={() => setSelectedEnsDomain(domain)}
                            >
                              <div className="aspect-square bg-gradient-to-br from-[#5298FF]/10 to-[#3370CC]/10 overflow-hidden">
                                <img
                                  src={domain.image_url || `https://metadata.ens.domains/mainnet/avatar/${domain.name}`}
                                  alt={domain.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                                <div className="hidden w-full h-full bg-gradient-to-br from-[#5298FF] to-[#3370CC] flex items-center justify-center">
                                  <span className="text-white font-bold text-2xl">ENS</span>
                                </div>
                              </div>
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                <p className="text-white text-xs font-medium truncate">{domain.name}</p>
                                <p className="text-white/60 text-[10px] capitalize">{domain.type || 'owned'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ) : nftCategory === 'basenames' ? (
                    // Basenames - Grid layout with avatars
                    basenamesLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-[#0052FF]" />
                      </div>
                    ) : basenames.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <p>No Basenames found</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-w-2xl mx-auto">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 justify-items-center">
                          {basenames.map((domain: any, index: number) => (
                            <div
                              key={`basename-${domain.name}-${index}`}
                              className="group relative overflow-hidden rounded-xl cursor-pointer border border-[#0052FF]/20 hover:border-[#0052FF]/50 transition-all w-full"
                              onClick={() => setSelectedBasename(domain)}
                            >
                              <div className="aspect-square bg-gradient-to-br from-[#0052FF]/10 to-[#4D8FFF]/10 overflow-hidden">
                                <img
                                  src={domain.image_url}
                                  alt={domain.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                                <div className="hidden w-full h-full bg-gradient-to-br from-[#0052FF] to-[#4D8FFF] flex items-center justify-center">
                                  <span className="text-white font-bold text-xl">BASE</span>
                                </div>
                              </div>
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                <p className="text-white text-xs font-medium truncate">{domain.name}</p>
                                <p className="text-white/60 text-[10px] capitalize">{domain.type || 'owned'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ) : nftCategory === 'iotanames' ? (
                    // IOTA Names - Grid layout
                    iotaLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-[#00BFA5]" />
                      </div>
                    ) : iotaNfts.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <p>No IOTA Names found</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {iotaNfts.map((iotaName: any, index: number) => (
                          <div key={iotaName.name || index} className="group relative overflow-hidden rounded-xl cursor-pointer border border-[#00BFA5]/30 hover:border-[#00BFA5]/60 transition-all bg-gradient-to-br from-[#00BFA5]/20 to-[#00D9C4]/20 p-3">
                            <div className="flex flex-col items-center gap-2">
                              {iotaName.imageUrl ? (
                                <img src={iotaName.imageUrl} alt={iotaName.name} className="w-12 h-12 rounded-full object-cover" />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00BFA5] to-[#00D9C4] flex items-center justify-center text-white font-bold text-lg">
                                  {iotaName.name?.charAt(0).toUpperCase() || 'I'}
                                </div>
                              )}
                              <p className="text-foreground text-sm font-medium truncate max-w-full">{iotaName.name || 'IOTA Name'}</p>
                              {iotaName.collection && (
                                <p className="text-foreground/60 text-xs truncate max-w-full">{iotaName.collection}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : null}
                </div>
              </div>
            )}

            {/* Tokens Overlay */}
            {showTokensOverlay && (
              <div className="fixed left-0 right-0 bg-background dark:bg-black z-[9998] animate-fade-in flex flex-col" style={{ backfaceVisibility: 'hidden', top: 'calc(env(safe-area-inset-top, 0px) + 64px)', bottom: 0 }}>
                {/* Header with ENS image banner */}
                <div 
                  className="relative w-full h-20 bg-cover bg-center flex-shrink-0 overflow-hidden"
                  style={{ 
                    backgroundImage: `url(${web3BioProfile?.header || iotaHeaderPattern})`
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 dark:to-background/90" />
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2">
                    <div className="w-10" />
                    <div className="px-4 py-1.5 rounded-full bg-background/80 backdrop-blur-sm">
                      <h3 className="text-lg font-bold text-black dark:text-white">Tokens</h3>
                    </div>
                    <button
                      onClick={() => setShowTokensOverlay(false)}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-background/80 hover:bg-background dark:bg-[#D4AF37] dark:hover:bg-[#B8860B] transition-all backdrop-blur-sm"
                    >
                      <X className="w-4 h-4 text-black" />
                    </button>
                  </div>
                </div>

                {/* Tokens Content */}
                <div className="flex-1 overflow-y-auto px-4 py-3 pb-24">
                  {portfolioLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                    </div>
                  ) : portfolioTokens.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-lg">No tokens found</p>
                      <p className="text-sm mt-2">This wallet doesn't have any tokens with value</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-w-lg mx-auto">
                      {/* Portfolio Total Value */}
                      {portfolioTotalValue > 0 && (
                        <div className="text-center mb-4 p-4 rounded-2xl bg-gradient-to-r from-[#D4AF37]/10 to-[#D4AF37]/5 border border-[#D4AF37]/20">
                          <p className="text-sm text-muted-foreground">Total Value</p>
                          <p className="text-2xl font-bold text-[#D4AF37]">${portfolioTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                      )}
                      
                      {/* Token List */}
                      {portfolioTokens.map((token: any, index: number) => (
                        <div 
                          key={token.id || `token-${index}`}
                          className="flex items-center gap-3 p-3 rounded-xl bg-card/30 border border-border/30 hover:border-[#D4AF37]/30 transition-all"
                        >
                          {token.icon ? (
                            <img src={token.icon} alt={token.symbol} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] font-bold">
                              {token.symbol?.slice(0, 2) || '?'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-foreground truncate">
                                {token.chain === 'iota' ? 'IOTA' : token.chain === 'eth' ? 'Ethereum' : token.chain === 'worldchain' ? 'Worldchain' : token.chain === 'base' ? 'Base' : token.chain === 'polygon' ? 'Polygon' : token.chain === 'arbitrum' ? 'Arbitrum' : token.chain === 'optimism' ? 'Optimism' : token.chain === 'hyperevm' ? 'HyperEVM' : (token.chain ? token.chain.charAt(0).toUpperCase() + token.chain.slice(1) : token.name)}
                              </span>
                              <span className="text-sm font-semibold text-foreground">${token.value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                {token.symbol?.toUpperCase() === 'IOTA' && <img src={IOTA_ICON_URL} alt="IOTA" className="w-3.5 h-3.5 rounded-full" />}
                                {token.quantity?.toLocaleString(undefined, { maximumFractionDigits: 4 })} {token.symbol}
                              </span>
                              {token.priceChange24h != null && !isNaN(token.priceChange24h) && token.priceChange24h !== 0 && (
                                <span className={token.priceChange24h > 0 ? 'text-green-500' : 'text-red-500'}>
                                  {token.priceChange24h > 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Activity Overlay */}
            {showActivityOverlay && (
              <div className="fixed left-0 right-0 bg-background dark:bg-black z-[9998] animate-fade-in flex flex-col" style={{ backfaceVisibility: 'hidden', top: 'calc(env(safe-area-inset-top, 0px) + 64px)', bottom: 0 }}>
                {/* Header */}
                <div 
                  className="relative w-full h-20 bg-cover bg-center flex-shrink-0 overflow-hidden"
                  style={{ backgroundImage: `url(${web3BioProfile?.header || iotaHeaderPattern})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 dark:to-background/90" />
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2">
                    <div className="w-10" />
                    <div className="px-4 py-1.5 rounded-full bg-background/80 backdrop-blur-sm">
                      <h3 className="text-lg font-bold text-black dark:text-white">Activity</h3>
                    </div>
                    <button
                      onClick={() => setShowActivityOverlay(false)}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-background/80 hover:bg-background dark:bg-[#D4AF37] dark:hover:bg-[#B8860B] transition-all backdrop-blur-sm"
                    >
                      <X className="w-4 h-4 text-black" />
                    </button>
                  </div>
                </div>

                {/* Activity Content */}
                <div className="flex-1 overflow-y-auto px-4 py-3 pb-24">
                  {transactionsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-lg">No transactions found</p>
                      <p className="text-sm mt-2">Transaction history coming soon</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-w-lg mx-auto">
                      {transactions.map((tx: any, index: number) => (
                        <div 
                          key={tx.id || `tx-${index}`}
                          className="flex items-center gap-3 p-3 rounded-xl bg-card/30 border border-border/30 hover:border-[#D4AF37]/30 transition-all"
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'receive' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                            <span className="text-lg">{tx.type === 'receive' ? '↓' : '↑'}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-foreground truncate capitalize">{tx.type || 'Transaction'}</span>
                              <span className="text-xs text-muted-foreground">
                                {tx.minedAt ? formatDistanceToNow(new Date(tx.minedAt), { addSuffix: true }) : ''}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <span className="truncate">{tx.hash?.slice(0, 10)}...</span>
                              <span className="text-xs uppercase">{tx.chain}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Socials Section */}
        {activeSection === 'socials' && (
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-4 pb-24">
            <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <h3 className="text-2xl font-bold text-[#D4AF37]">Social Links</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {web3BioProfile?.links && Object.entries(web3BioProfile.links)
                .filter(([platform, linkData]) => platform.toLowerCase() !== 'website' && linkData)
                .map(([platform, linkData]: [string, any]) => {
                  const displayLabel = platform.charAt(0).toUpperCase() + platform.slice(1);
                  const rawUrl = typeof linkData === 'string' ? linkData : linkData?.link;
                  
                  if (!rawUrl) return null;

                  const normalized = normalizeSocialUrl(platform, rawUrl);
                  
                  return (
                    <button
                      key={platform}
                      onClick={() => {
                        if (normalized.isDiscordUsername) {
                          navigator.clipboard.writeText(normalized.displayHandle);
                          toast.success(`Copied Discord username: ${normalized.displayHandle}`);
                        } else if (normalized.url) {
                          window.open(normalized.url, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      className="flex items-center gap-4 p-4 rounded-2xl border border-border/30 hover:border-[#D4AF37]/50 bg-card/30 hover:bg-card/50 transition-colors active:opacity-90 group touch-action-manipulation flex-shrink-0"
                    >
                      <SocialIcon
                        platform={platform}
                        url={rawUrl}
                        size="md"
                      />
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-base text-foreground group-hover:text-[#D4AF37] transition-colors">
                          {displayLabel}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {normalized.displayHandle || extractHandle(platform, rawUrl)}
                        </div>
                      </div>
                      {normalized.isDiscordUsername ? (
                        <Copy className="w-4 h-4 text-muted-foreground group-hover:text-[#D4AF37] transition-colors flex-shrink-0" />
                      ) : (
                        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-[#D4AF37] transition-colors flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
            </div>

            {(!web3BioProfile?.links || Object.keys(web3BioProfile.links).length === 0) && (
              <div className="text-center py-12 bg-gradient-to-br from-card/40 to-card/20 rounded-2xl border border-border/30">
                <Globe className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground text-base">No social links configured</p>
              </div>
            )}
            </div>
            </div>
          </div>
        )}

        {/* NFTs Section - Only show if user has NFTs or POAPs (including World Chain) */}
        {activeSection === 'nfts' && (nfts.length > 0 || poaps.length > 0 || worldchainNftCount > 0 || nftLoading || worldchainNftsLoading) && (
          <div className="flex flex-col h-full">
            <div className="flex-shrink-0 p-4 border-b border-border/30">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {availableCollections.length > 1 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="border-border/50 bg-background/60 hover:bg-background/80 hover:border-[#D4AF37]/50 transition-colors h-10 w-10 rounded-xl">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="4" y1="21" x2="4" y2="14"></line>
                            <line x1="4" y1="10" x2="4" y2="3"></line>
                            <line x1="12" y1="21" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12" y2="3"></line>
                            <line x1="20" y1="21" x2="20" y2="16"></line>
                            <line x1="20" y1="12" x2="20" y2="3"></line>
                            <line x1="2" y1="14" x2="6" y2="14"></line>
                            <line x1="10" y1="8" x2="14" y2="8"></line>
                            <line x1="18" y1="16" x2="22" y2="16"></line>
                          </svg>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-72 bg-background/95 backdrop-blur-xl border-border/50 max-h-80 overflow-y-auto">
                        {availableCollections.map(collection => (
                          <DropdownMenuCheckboxItem
                            key={collection}
                            checked={selectedCollections.includes(collection)}
                            onCheckedChange={() => handleCollectionToggle(collection)}
                            className="hover:bg-[#D4AF37]/10 cursor-pointer"
                          >
                            <span className="font-medium">{formatCollectionName(collection)}</span>
                          </DropdownMenuCheckboxItem>
                        ))}
                        {selectedCollections.length > 0 && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setSelectedCollections([])}
                              className="text-[#D4AF37] hover:bg-[#D4AF37]/10 cursor-pointer font-medium"
                            >
                              Clear all filters
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <h3 className="text-2xl font-bold text-[#D4AF37]">NFTs</h3>
                </div>

                {availableCollections.length > 1 && selectedCollections.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedCollections.map(collection => (
                      <Badge
                        key={collection}
                        variant="secondary"
                        className="cursor-pointer bg-[#D4AF37]/15 text-[#D4AF37] hover:bg-[#D4AF37]/25 border border-[#D4AF37]/30 transition-colors font-medium px-3 py-1"
                        onClick={() => handleCollectionToggle(collection)}
                      >
                        {formatCollectionName(collection)} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {nfts.length === 0 ? (
                <div className="text-center py-16 bg-gradient-to-br from-card/40 to-card/20 rounded-2xl border border-border/30">
                  <div className="relative inline-block mb-4">
                    <div className="text-7xl opacity-30">🖼️</div>
                    <div className="absolute inset-0 bg-[#D4AF37]/10 blur-2xl"></div>
                  </div>
                  <h4 className="text-lg font-semibold text-foreground mb-2">No NFTs Found</h4>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    This wallet doesn't have any NFTs yet on supported chains
                  </p>
                </div>
              ) : filteredNfts.length === 0 ? (
                <div className="text-center py-16 bg-gradient-to-br from-card/40 to-card/20 rounded-2xl border border-border/30">
                  <div className="relative inline-block mb-4">
                    <div className="text-7xl opacity-30">🔍</div>
                    <div className="absolute inset-0 bg-[#D4AF37]/10 blur-2xl"></div>
                  </div>
                  <h4 className="text-lg font-semibold text-foreground mb-2">No Matches Found</h4>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
                    No NFTs match your current filter criteria
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedCollections([])}
                    className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                  >
                    Clear All Filters
                  </Button>
                </div>
              ) : (
                <>
                  {expandedCollection ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 pb-3 border-b border-border/40">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedCollection(null)}
                          className="text-[#D4AF37] hover:text-[#D4AF37]/80 hover:bg-[#D4AF37]/10"
                        >
                          <ChevronDown className="w-4 h-4 mr-2 rotate-90" />
                          Back to Collections
                        </Button>
                        <div className="flex-1">
                          <h4 className="font-bold text-foreground text-lg">{formatCollectionName(expandedCollection)}</h4>
                          <p className="text-xs text-muted-foreground">
                            {openSeaGroupedNfts[expandedCollection]?.length || 0} items
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {openSeaGroupedNfts[expandedCollection]?.map((nft: any, index: number) => (
                          <div
                            key={`${nft.contract}-${nft.identifier}-${index}`}
                            className="group relative overflow-hidden rounded-xl cursor-pointer active:opacity-90 transition-opacity flex-shrink-0 touch-action-manipulation"
                            onClick={() => setSelectedNft(nft)}
                          >
                            <div className="aspect-square relative overflow-hidden bg-black/20">
                              {nft.image_url ? (
                                <img
                                  src={nft.image_url}
                                  alt={nft.name || 'NFT'}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-muted/20">
                                  <div className="text-4xl opacity-40">🖼️</div>
                                </div>
                              )}
                              
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-[background-color,opacity] duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <div className="text-white text-sm font-semibold">View Details</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 px-2">
                      {Object.entries(openSeaGroupedNfts).map(([collection, collectionNfts]: [string, any[]]) => (
                        <button
                          key={collection}
                          onClick={() => setExpandedCollection(collection)}
                          className="w-full h-16 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] text-black transition-all duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] touch-action-manipulation flex-shrink-0"
                        >
                          <div className="flex items-center justify-between h-full">
                            <div className="text-left flex-1 min-w-0 mr-3">
                              <h4 className="font-medium text-black text-base truncate">
                                {formatCollectionName(collection)}
                              </h4>
                              <p className="text-sm text-[#D4AF37]">
                                {collectionNfts.length} {collectionNfts.length === 1 ? 'item' : 'items'}
                              </p>
                            </div>
                            <ChevronDown className="w-5 h-5 text-black -rotate-90 flex-shrink-0" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* World Chain NFTs Section */}
            {web3BioProfile?.address && !expandedCollection && (
              <div className="p-4 border-t border-border/30">
                <WorldchainNFTSection walletAddress={web3BioProfile.address} />
              </div>
            )}

            {web3BioProfile?.address && !expandedCollection && nfts.length > 0 && (
              <div className="p-4 border-t border-border/30">
                <Button
                  asChild
                  className="w-full bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30"
                >
                  <a
                    href={`https://opensea.io/${web3BioProfile.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View On OpenSea
                  </a>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Farcaster Section */}
        {activeSection === 'farcaster' && (
          <div className="flex-1 overflow-y-auto" style={{ minHeight: '400px' }}>
            <div className="space-y-4 pb-24">
            <div className="p-6">
            <h3 className="text-2xl font-bold text-[#D4AF37] mb-6">📰 Farcaster Feed</h3>
            <div>{/* Removed max-h and overflow-y-auto */}
              {castLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : !latestCast ? (
                <div className="text-center py-8 text-muted-foreground">No Farcaster activity found</div>
              ) : (
                <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
                  <div className="flex gap-3">
                    <Avatar className="h-12 w-12 border-2 border-[#D4AF37]/20">
                      <AvatarImage src={latestCast.author.pfp_url} alt={latestCast.author.display_name} />
                      <AvatarFallback className="bg-[#D4AF37]/10 text-[#D4AF37]">
                        {latestCast.author.display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {latestCast.author.display_name}
                            </span>
                            {latestCast.channel && (
                              <Badge variant="outline" className="text-xs border-[#D4AF37]/30 text-muted-foreground">
                                /{latestCast.channel.id}
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            @{latestCast.author.username} · {formatDistanceToNow(new Date(latestCast.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        <a
                          href={`https://warpcast.com/${latestCast.author.username}/${latestCast.hash.slice(0, 10)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-[#D4AF37] transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>

                      <p className="text-foreground whitespace-pre-wrap mb-3 leading-relaxed">
                        {formatCastText(latestCast.text)}
                      </p>

                      {latestCast.embeds.length > 0 && (() => {
                        const imageEmbed = latestCast.embeds.find(e => e?.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i));
                        const videoEmbed = latestCast.embeds.find(e => e?.url?.match(/\.(mp4|webm|mov)$/i));
                        
                        if (imageEmbed) {
                          return (
                            <div className="mb-3 rounded-xl overflow-hidden border-2 border-[#D4AF37]/20 shadow-lg">
                              <img
                                src={imageEmbed.url}
                                alt="Cast media"
                                className="w-full max-h-[500px] object-contain bg-black/20"
                                loading="lazy"
                              />
                            </div>
                          );
                        }
                        
                        if (videoEmbed) {
                          return (
                            <div className="mb-3 rounded-xl overflow-hidden border-2 border-[#D4AF37]/20 shadow-lg">
                              <video
                                src={videoEmbed.url}
                                controls
                                className="w-full max-h-[500px] bg-black/20"
                                playsInline
                              />
                            </div>
                          );
                        }
                        
                        return null;
                      })()}

                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <MessageCircle className="w-4 h-4" />
                          <span>{latestCast.replies.count}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Repeat2 className="w-4 h-4" />
                          <span>{latestCast.reactions.recasts_count}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Heart className="w-4 h-4" />
                          <span>{latestCast.reactions.likes_count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
            </div>
            </div>
          </div>
        )}
      </div>

      {selectedPoap && (
        <PoapDetailModal
          poap={selectedPoap}
          isOpen={!!selectedPoap}
          onClose={() => setSelectedPoap(null)}
        />
      )}

      {selectedNft && (
        <NFTDetailModal
          nft={selectedNft}
          isOpen={!!selectedNft}
          onClose={() => setSelectedNft(null)}
        />
      )}

      {/* Talent Protocol Modal */}
      <TalentProtocolModal
        open={showTalentModal}
        onOpenChange={setShowTalentModal}
        wallet={currentWalletAddress}
        ens={searchedIdentity?.includes('.') ? searchedIdentity : undefined}
      />

      {/* Avatar Popup Modal */}
      {showAvatarPopup && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowAvatarPopup(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button
              onClick={() => setShowAvatarPopup(false)}
              className="absolute -top-12 right-0 w-10 h-10 flex items-center justify-center rounded-full bg-background/80 hover:bg-background transition-all z-10"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
            <img
              src={web3BioProfile?.avatar || vanityBoxAvatar}
              alt={web3BioProfile?.displayName || 'User'}
              className="max-w-[90vw] max-h-[80vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Header Popup Modal */}
      {showHeaderPopup && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowHeaderPopup(false)}
        >
          <div className="relative max-w-[95vw] max-h-[90vh]">
            <button
              onClick={() => setShowHeaderPopup(false)}
              className="absolute -top-12 right-0 w-10 h-10 flex items-center justify-center rounded-full bg-background/80 hover:bg-background transition-all z-10"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
            <img
              src={web3BioProfile?.header || iotaHeaderPattern}
              alt="Header"
              className="max-w-[95vw] max-h-[80vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* ENS Domain Detail Modal */}
      <ENSDomainDetailModal
        domain={selectedEnsDomain}
        open={!!selectedEnsDomain}
        onOpenChange={(open) => !open && setSelectedEnsDomain(null)}
      />

    </>
  );
};
