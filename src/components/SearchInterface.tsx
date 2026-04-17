import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  X,
  Filter,
  ChevronDown,
  ArrowLeft,
  Globe,
  ExternalLink,
  Copy,
  Mail,
  MapPin,
  Github,
  Send,
  Eye,
  Hourglass,
  Share2,
  Check,
  Info,
  Home,
  Pencil,
} from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { supabase } from "@/integrations/supabase/client";
import { createPublicClient, http, isAddress, getAddress } from 'viem';
import { isValidIotaAddress } from '@/lib/iota/client';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { MiniKit } from "@worldcoin/minikit-js";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "next-themes";
import { SubdomainMintModal } from "@/components/SubdomainMintModal";
import { PersonalizedHeader } from "@/components/PersonalizedHeader";
import { UserDomainsDisplay } from "@/components/UserDomainsDisplay";
import { SpotifyPlayerModal } from "@/components/SpotifyPlayerModal";
import Dock from "@/components/Dock";
import { ProfileCard } from "@/components/ProfileCard";
import { PasskeyWalletModal } from "@/components/PasskeyWalletModal";
import { VanityBundleCard } from "@/components/VanityBundleCard";
import { ENSRegistrationCard } from "@/components/ENSRegistrationCard";
import { NameSearchCarousel } from "@/components/NameSearchCarousel";
import { HomeFeatureShowcase } from "@/components/HomeFeatureShowcase";
import { IotaProfileEditModal } from "@/components/IotaProfileEditModal";
import { useIotaWallet } from "@/contexts/IotaWalletContext";
import { useSignPersonalMessageSafe } from "@/hooks/use-iota-wallet-safe";
import { MessageCircle, Repeat2, Heart, Fingerprint } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import ensLogoBlue from "@/assets/ens-logo-blue.png";
import ensLogoWhite from "@/assets/ens-logo-white.png";
import defaultHeaderPattern from "@/assets/eth-pattern-header.jpeg";
import smithCashAvatar from "@/assets/smith-cash-avatar.png";
import smithBoxAvatar from "@/assets/smith-box-avatar.jpeg";
import vapeBoxAvatar from "@/assets/vape-box-avatar.webp";
import aptosLogo from "@/assets/aptos-logo.png";
import aptosNamesIcon from "@/assets/aptos-names-icon.jpeg";
import aptosNamesLight from "@/assets/aptos-names-light.png";
import aptosNamesNew from "@/assets/aptos-names-new.jpeg";
import avvyLogo from "@/assets/avvy-logo.png";
import smithAptAvatar from "@/assets/smith-apt-avatar.png";
import vanityContactIcon from "@/assets/vanity-contact-icon.png";
import termuxAvatar from "@/assets/termux-avatar.png";
import mithEthAvatar from "@/assets/mith-eth-avatar.png";
import teamxrpAvatar from "@/assets/teamxrp-avatar.png";
import eth30315Avatar from "@/assets/30315-eth-avatar.png";
import telegramIcon from "@/assets/telegram-icon.png";
import discordIcon from "@/assets/discord-icon.png";
import githubIcon from "@/assets/github-icon.png";
import instagramIcon from "@/assets/instagram-icon.png";
import linkedinIcon from "@/assets/linkedin-icon.png";
import redditIcon from "@/assets/reddit-icon.png";
import blueskyIcon from "@/assets/bluesky-icon.png";
import whatsappIcon from "@/assets/whatsapp-icon.png";
import { formatDistanceToNow } from "date-fns";
import type { FarcasterCast } from "@/types/farcaster";
import { callEdge } from "@/lib/supaInvoke";
import { User, Link2, Image, MessageSquare } from "lucide-react";
import ensV2Logo from "@/assets/ens-v2-logo.png";
import web3BioLogo from "@/assets/web3bio-logo.png";
import efpLogoFullDark from "@/assets/efp-logo-full-dark.png";
import poapLogo from "@/assets/poap-icon.png";
import spydaAvatar from "@/assets/spyda-avatar.jpeg";
import flirtadAvatar from "@/assets/flirtad-avatar.jpeg";
import prettyuglyAvatar from "@/assets/prettyugly-avatar.png";
import sanAndreasAvatar from "@/assets/sanandreas-avatar.png";
import guavapayAvatar from "@/assets/guavapay-avatar.png";
import mexipayAvatar from "@/assets/mexipay-avatar.png";
import tonLogo from "@/assets/ton-logo.png";
import vanityTonAvatar from "@/assets/vanity-ton-avatar.png";
import vanityBoxAvatar from "@/assets/vanity-box-avatar.png";
import vanityAptAvatar from "@/assets/vanity-apt-avatar.jpeg";
import vanityHlAvatar from "@/assets/vanity-hl-avatar.png";
import vanityVetAvatar from "@/assets/vanity-vet-avatar.png";
import vanityIotaAvatar from "@/assets/vanity-iota-avatar.png";
import worldAppIcon from "@/assets/world-app-icon.png";
import { DynamicMetaTags } from "@/components/DynamicMetaTags";
import searchLogo from "@/assets/search-logo.png";
import { isIotaName } from "@/lib/iota/isIotaName";
import { makeIotaDisplayProfile } from "@/lib/iota/iotaDisplayProfile";
import { setLinkedDomain } from "@/lib/messaging/linkDomain";
import { loadVaultFromStorage } from "@/lib/identity/vault";


import { PoapCarousel } from "@/components/PoapCarousel";
import { LoadingProgress } from "@/components/LoadingProgress";

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
  network?: string;
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
  website?: string;
  farcaster?: {
    fid?: number;
  };
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

interface SearchInterfaceProps {
  onSearchClick?: () => void;
  onClearSearch?: () => void;
}

export const SearchInterface = ({ onSearchClick, onClearSearch }: SearchInterfaceProps) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const { username } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const searchIdRef = useRef(0); // Prevent stale searches
  const [searchQuery, setSearchQuery] = useState("");
  
  // Get IOTA wallet state
  const { address: iotaWalletAddress, isConnected: isIotaConnected } = useIotaWallet();
  const signPersonalMessageHook = useSignPersonalMessageSafe();

  // Create the onSignPersonalMessage callback for passkey modal
  const iotaSignPersonalMessage = React.useCallback(async (message: Uint8Array) => {
    const result = await signPersonalMessageHook.mutateAsync({ message });
    return { signature: result.signature };
  }, [signPersonalMessageHook.mutateAsync]);

  // Function to remove underscores from input
  const handleSearchChange = (value: string) => {
    setSearchQuery(value.replace(/_/g, ""));
  };
  const [displayQuery, setDisplayQuery] = useState(""); // The actual searched query for display
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [showMintInterface, setShowMintInterface] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ENSResult | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ protocol: [], club: [] });
  const [hasManuallyAdjustedFilters, setHasManuallyAdjustedFilters] = useState(false);
  const [ensResults, setEnsResults] = useState<ENSResult[]>([]);
  const [hasSearched, setHasSearched] = useState(true); // Start as true to prevent initial flicker
  const [walletAddress, setWalletAddress] = useState<string | undefined>(undefined);
  const [connectedUsername, setConnectedUsername] = useState<string | undefined>(undefined);
  const [connectedWalletType, setConnectedWalletType] = useState<string | undefined>(undefined);
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
  const [poapCount, setPoapCount] = useState<number>(0);
  const [poapTotalCount, setPoapTotalCount] = useState<number>(0);
  const [poapHasMore, setPoapHasMore] = useState<boolean>(false);
  const [poapOffset, setPoapOffset] = useState<number>(0);
  const [poapLoadingMore, setPoapLoadingMore] = useState<boolean>(false);
  const [isLoadingPoaps, setIsLoadingPoaps] = useState(false);
  const [followersPage, setFollowersPage] = useState(0);
  const [followingPage, setFollowingPage] = useState(0);
  const [totalFollowers, setTotalFollowers] = useState(0);
  const [totalFollowing, setTotalFollowing] = useState(0);
  const [followersSearchQuery, setFollowersSearchQuery] = useState("");
  const [followingSearchQuery, setFollowingSearchQuery] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingEFP, setIsLoadingEFP] = useState(false);
  const [showSpotifyPlayer, setShowSpotifyPlayer] = useState(false);
  const [selectedSpotifyUrl, setSelectedSpotifyUrl] = useState("");
  const [selectedArtistName, setSelectedArtistName] = useState("");
  const [showDetailView, setShowDetailView] = useState(false);
  const [detailViewResult, setDetailViewResult] = useState<ENSResult | null>(null);
  const [showInitialResults, setShowInitialResults] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [hadPreviousProfile, setHadPreviousProfile] = useState(false);
  const [isHomepage, setIsHomepage] = useState(true);
  
  // Dock panel states
  const [activeDockSection, setActiveDockSection] = useState<'profile' | 'socials' | 'nfts' | 'farcaster'>('profile');
  const [poapTokens, setPoapTokens] = useState<any[]>([]);
  const [selectedPoap, setSelectedPoap] = useState<any>(null);
  const [showEFPFollowingModal, setShowEFPFollowingModal] = useState(false);
  const [efpFollowingUsers, setEfpFollowingUsers] = useState<EFPUser[]>([]);
  const [nfts, setNfts] = useState<any[]>([]);
  const [nftLoading, setNftLoading] = useState(false);
  const [nftNextCursor, setNftNextCursor] = useState<string | null>(null);
  const [openseaAttempted, setOpenseaAttempted] = useState(false);
  const [openseaHasErrors, setOpenseaHasErrors] = useState(false);
  const [latestCast, setLatestCast] = useState<FarcasterCast | null>(null);
  const [castLoading, setCastLoading] = useState(false);
  const [firstTransactionDate, setFirstTransactionDate] = useState<string | null>(null);

   // IOTA Onchain Profile state + cache
  const [iotaOnchainProfile, setIotaOnchainProfile] = useState<any>(null);
  const [iotaNameObjectId, setIotaNameObjectId] = useState<string | null>(null);
  const [iotaOwnerAddress, setIotaOwnerAddress] = useState<string | null>(null);
  const [iotaOnchainProfileLoading, setIotaOnchainProfileLoading] = useState(false);
  const [showIotaEditModal, setShowIotaEditModal] = useState(false);
  const [showPasskeyModal, setShowPasskeyModal] = useState(false);
  const iotaProfileCacheRef = useRef<Map<string, { profile: any; nameObjectId: string | null; ownerAddress: string | null }>>(new Map());

  // Linked EVM address for .iota profiles (resolved from iota_wallet_links)
  const [linkedEvmAddress, setLinkedEvmAddress] = useState<string | null>(null);
  const [isResolvingLinkedEvm, setIsResolvingLinkedEvm] = useState(false);
  const linkedEvmResolverRef = useRef<string | null>(null); // dedupe by name+wallet context, not only name

  // Linked TON address for .iota profiles (resolved from iota_wallet_links)
  const [linkedTonAddress, setLinkedTonAddress] = useState<string | null>(null);
  const linkedTonResolverRef = useRef<string | null>(null);

  const isValidEvmAddress = (address?: string | null): address is string => {
    return !!address && /^0x[a-fA-F0-9]{40}$/i.test(address);
  };

  const normalizeIotaQuery = (value?: string | null): string | null => {
    const normalized = value?.toLowerCase()?.trim();
    return normalized && isIotaName(normalized) ? normalized : null;
  };

  const fetchIotaOnchainProfile = async (rawName?: string | null): Promise<any | null> => {
    const normalizedName = normalizeIotaQuery(rawName);
    if (!normalizedName) return null;

    const { data, error } = await supabase.functions.invoke("get-iota-onchain-profile", {
      body: { name: normalizedName },
    });

    if (error) {
      console.warn("[SearchInterface] get-iota-onchain-profile failed", { normalizedName, error });
      return null;
    }

    return data;
  };

  const fetchLinkedEvmFromDb = async (rawName?: string | null): Promise<any | null> => {
    const normalizedName = normalizeIotaQuery(rawName);
    if (!normalizedName) return null;

    const { data, error } = await supabase.functions.invoke("get-iota-linked-evm", {
      body: { iotaName: normalizedName },
    });

    if (error) {
      console.warn("[SearchInterface] get-iota-linked-evm failed", { normalizedName, error });
      return null;
    }

    return data;
  };

  // Social icons mapping
  const socialIcons: Record<string, string> = {
    telegram: telegramIcon,
    discord: discordIcon,
    github: githubIcon,
    instagram: instagramIcon,
    linkedin: linkedinIcon,
    reddit: redditIcon,
    bluesky: blueskyIcon,
    whatsapp: whatsappIcon,
  };

  // Get wallet address from MiniKit
  useEffect(() => {
    // Only check MiniKit on initial mount or when no wallet type is set yet.
    // When connectedWalletType is already 'iota' (or another type), the walletAddress
    // is managed by the reactive sync effect below — calling checkWallet() here would
    // reset it to undefined and cause the "double sign-in" bug.
    if (!connectedWalletType) {
      const address = MiniKit.user?.walletAddress;
      setWalletAddress(address);
    }

    // Listen for wallet connection events — ignore walletconnect if IOTA is primary
    const handleWalletChange = (event: CustomEvent) => {
      const incomingType = event.detail?.walletType;
      // If IOTA is already our primary wallet, ignore walletconnect events
      if (incomingType === 'walletconnect' && connectedWalletType === 'iota') {
        console.log('[SearchInterface] Ignoring walletconnect event — IOTA is primary');
        return;
      }
      setWalletAddress(event.detail?.walletAddress);
      setConnectedUsername(event.detail?.username);
      setConnectedWalletType(event.detail?.walletType);
    };

    // Named handler for wallet-disconnected so we can check walletType
    const handleWalletDisconnected = (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      const disconnectedType = detail?.walletType;
      // Only clear state if the disconnected wallet matches the current primary,
      // or if no type info provided (legacy behavior)
      if (!disconnectedType || disconnectedType === connectedWalletType) {
        setWalletAddress(undefined);
        setConnectedUsername(undefined);
        setConnectedWalletType(undefined);
        setShowMyIDs(false);
      }
    };

    const handleShowMyIDs = () => {
      setShowMyIDs(true);
      setShowMintInterface(false);
      window.dispatchEvent(new CustomEvent("show-my-ids"));
    };

    const handleShowSearch = () => {
      setShowMyIDs(false);
      setWeb3BioProfile(null);
      setHasSearched(false);
    };

    window.addEventListener("wallet-connected", handleWalletChange as EventListener);
    window.addEventListener("wallet-disconnected", handleWalletDisconnected);
    window.addEventListener("show-my-ids", handleShowMyIDs);
    window.addEventListener("show-search", handleShowSearch);
    
    const handleToggleSearchBar = (event: CustomEvent) => {
      setShowSearchBar(event.detail.show);
    };
    
    // Listen for direct profile load from wallet menu
    const handleDirectProfileLoad = (event: CustomEvent) => {
      const { identifier, skipSearch } = event.detail;
      if (skipSearch && identifier) {
        console.log('🔍 Direct profile load requested for:', identifier);
        handleSearch(identifier);
      }
    };
    
    window.addEventListener("toggle-search-bar", handleToggleSearchBar as EventListener);
    window.addEventListener("load-direct-profile", handleDirectProfileLoad as EventListener);

    return () => {
      window.removeEventListener("wallet-connected", handleWalletChange as EventListener);
      window.removeEventListener("wallet-disconnected", handleWalletDisconnected);
      window.removeEventListener("show-my-ids", handleShowMyIDs);
      window.removeEventListener("show-search", handleShowSearch);
      window.removeEventListener("toggle-search-bar", handleToggleSearchBar as EventListener);
      window.removeEventListener("load-direct-profile", handleDirectProfileLoad as EventListener);
    };
  }, [connectedWalletType]);

  // Reactively sync IOTA wallet hook state into SearchInterface
  // Ensures wallet state updates immediately on connect/disconnect without event races
  useEffect(() => {
    if (isIotaConnected && iotaWalletAddress) {
      if (walletAddress !== iotaWalletAddress) {
        setWalletAddress(iotaWalletAddress);
        setConnectedWalletType('iota');
        callEdge<any>('resolve-iota-address', { address: iotaWalletAddress })
          .then((data) => {
            const name = typeof data?.name === 'string' ? data.name : null;
            if (name) setConnectedUsername(name);
          })
          .catch(() => {});
      }
    } else if (!isIotaConnected && connectedWalletType === 'iota') {
      // Context handles passkey session — if context says disconnected, trust it
      setWalletAddress(undefined);
      setConnectedUsername(undefined);
      setConnectedWalletType(undefined);
    }
  }, [isIotaConnected, iotaWalletAddress]);

  // Reset to profile section when new profile loads
  useEffect(() => {
    if (web3BioProfile) {
      setActiveDockSection('profile');
      // Clear previous profile's NFT data
      setNfts([]);
      setNftNextCursor(null);
      setOpenseaAttempted(false);
      setOpenseaHasErrors(false);
      setLatestCast(null);
      // Reset ALL POAP state to ensure fresh data for new profile
      setPoapTokens([]);
      setPoapCount(0);
      setPoapTotalCount(0);
      setPoapHasMore(false);
      setPoapOffset(0);
      setIsLoadingPoaps(false);
      // Reset detail view to fix glitch when loading new profile
      setShowDetailView(false);
      setDetailViewResult(null);
      // Reset linked EVM address
      setLinkedEvmAddress(null);
      linkedEvmResolverRef.current = null;
      // Reset linked TON address
      setLinkedTonAddress(null);
      linkedTonResolverRef.current = null;
    }
  }, [web3BioProfile]);

  // Auto-close detail view on route/location changes
  useEffect(() => {
    setShowDetailView(false);
    setDetailViewResult(null);
  }, [location.pathname]);

  // Preload EFP lists in background when profile loads
  useEffect(() => {
    const isIota = isIotaName(displayQuery);
    const efpAddress = isIota ? linkedEvmAddress : web3BioProfile?.address;
    
    if (efpAddress && /^0x[a-fA-F0-9]{40}$/i.test(efpAddress) && efpStats) {
      // Preload following list if count > 0
      if (efpStats.following_count > 0 && followingList.length === 0) {
        console.log('🔄 Background: Preloading EFP following list...');
        fetch(`https://api.ethfollow.xyz/api/v1/users/${efpAddress}/following?limit=10&offset=0`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data?.following) {
              setFollowingList(data.following);
              setTotalFollowing(data.following_count || efpStats.following_count);
              setFollowingPage(0);
              console.log(`✅ Background: Preloaded ${data.following.length} following users`);
            }
          })
          .catch(err => console.log('Background: EFP following preload failed', err));
      }

      // Preload followers list if count > 0
      if (efpStats.followers_count > 0 && followersList.length === 0) {
        console.log('🔄 Background: Preloading EFP followers list...');
        fetch(`https://api.ethfollow.xyz/api/v1/users/${efpAddress}/followers?limit=10&offset=0`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data?.followers) {
              setFollowersList(data.followers);
              setTotalFollowers(data.followers_count || efpStats.followers_count);
              setFollowersPage(0);
              console.log(`✅ Background: Preloaded ${data.followers.length} followers`);
            }
          })
          .catch(err => console.log('Background: EFP followers preload failed', err));
      }
    }
  }, [web3BioProfile?.address, linkedEvmAddress, efpStats, displayQuery]);

  // Resolve linked EVM address for .iota profiles
  // Priority: 1) localStorage 2) encrypted vault (owner) 3) DB via edge function (public viewers)
  useEffect(() => {
    const name = normalizeIotaQuery(displayQuery);
    if (!name) {
      setLinkedEvmAddress(null);
      setIsResolvingLinkedEvm(false);
      linkedEvmResolverRef.current = null;
      return;
    }

    let foundLocal = false;

    // 1) Check localStorage fallback immediately (set when VC was issued)
    try {
      const localEvm = localStorage.getItem(`iota-linked-evm:${name}`);
      if (isValidEvmAddress(localEvm)) {
        console.log(`⚡ Linked EVM from localStorage for ${name}: ${localEvm}`);
        setLinkedEvmAddress(localEvm.toLowerCase());
        foundLocal = true;
      }
    } catch {
      // no-op
    }

    // Re-resolve when wallet ownership context changes (name-only dedupe was blocking retries)
    const resolverKey = `${name}|${iotaWalletAddress || ''}|${iotaOwnerAddress || ''}`;
    if (linkedEvmResolverRef.current === resolverKey) return;
    linkedEvmResolverRef.current = resolverKey;

    setIsResolvingLinkedEvm(true);
    let isCancelled = false;

    // 2) Try encrypted identity vault (works for profile owner with existing VCs)
    const tryVaultFallback = async () => {
      const candidates = Array.from(new Set([iotaWalletAddress, iotaOwnerAddress].filter(Boolean) as string[]));

      for (const signatureCandidate of candidates) {
        try {
          const vault = await loadVaultFromStorage(signatureCandidate);
          if (!vault?.vcList?.length) continue;

          const matchedVc = [...vault.vcList]
            .reverse()
            .find(
              (vc: any) =>
                vc?.type === 'EthereumWalletOwnershipCredential' &&
                isValidEvmAddress(vc?.claims?.address) &&
                vc?.claims?.name?.toLowerCase?.() === name
            );

          if (matchedVc && !isCancelled) {
            const evmAddr = matchedVc.claims.address.toLowerCase();
            console.log(`🔓 Linked EVM from vault for ${name}: ${evmAddr}`);
            setLinkedEvmAddress(evmAddr);
            try { localStorage.setItem(`iota-linked-evm:${name}`, evmAddr); } catch {}
            return true;
          }
        } catch {
          // Vault decryption failed for this candidate — expected for non-owner
        }
      }

      return false;
    };

    const resolve = async () => {
      const fromVault = await tryVaultFallback();
      if (isCancelled) return;

      // 3) Query DB for public viewers or as final fallback
      if (!fromVault) {
        const res = await fetchLinkedEvmFromDb(name);
        if (!isCancelled && res?.success && isValidEvmAddress(res?.evmAddress)) {
          const evmAddr = res.evmAddress.toLowerCase();
          console.log(`✅ Linked EVM from DB for ${name}: ${evmAddr}`);
          setLinkedEvmAddress(evmAddr);
          try { localStorage.setItem(`iota-linked-evm:${name}`, evmAddr); } catch {}
        } else if (!isCancelled && !foundLocal) {
          setLinkedEvmAddress(null);
        }
      }

      if (!isCancelled) setIsResolvingLinkedEvm(false);
    };

    resolve();

    return () => {
      isCancelled = true;
    };
  }, [displayQuery, iotaWalletAddress, iotaOwnerAddress]);

  // Listen for real-time 'iota-evm-linked' events (fired when VC is issued in the same session)
  useEffect(() => {
    const handleEvmLinked = (event: Event) => {
      const { iotaName: linkedName, evmAddress } = (event as CustomEvent).detail || {};
      const currentName = displayQuery?.toLowerCase()?.trim();
      if (linkedName === currentName && evmAddress && /^0x[a-fA-F0-9]{40}$/i.test(evmAddress)) {
        console.log(`🔗 Real-time EVM link event for ${linkedName}: ${evmAddress}`);
        setLinkedEvmAddress(evmAddress);
        // Reset stale NFT/POAP state so fresh fetch triggers
        setNfts([]);
        setNftNextCursor(null);
        setOpenseaAttempted(false);
        setOpenseaHasErrors(false);
        setPoapTokens([]);
        setPoapCount(0);
        setPoapTotalCount(0);
        setPoapHasMore(false);
        setPoapOffset(0);
        // Also fetch EFP stats for newly linked address
        setEfpStats(null);
        supabase.functions.invoke('get-efp-stats', {
          body: { address: evmAddress }
        }).then(({ data: efpData }) => {
          if (efpData && (efpData.followers_count > 0 || efpData.following_count > 0)) {
            console.log('✅ EFP stats loaded for linked EVM:', efpData);
            setEfpStats(efpData);
          }
        }).catch(err => console.log('EFP stats fetch failed for linked EVM:', err));
      }
    };
    const handleEvmUnlinked = (event: Event) => {
      const { iotaName: unlinkedName } = (event as CustomEvent).detail || {};
      const currentName = displayQuery?.toLowerCase()?.trim();
      if (unlinkedName === currentName) {
        console.log(`🔓 EVM unlinked for ${unlinkedName}`);
        setLinkedEvmAddress(null);
        linkedEvmResolverRef.current = null;
        setNfts([]);
        setNftNextCursor(null);
        setOpenseaAttempted(false);
        setOpenseaHasErrors(false);
        setPoapTokens([]);
        setPoapCount(0);
        setPoapTotalCount(0);
        setPoapHasMore(false);
        setPoapOffset(0);
        setEfpStats(null);
      }
    };
    window.addEventListener('iota-evm-linked', handleEvmLinked);
    window.addEventListener('iota-evm-unlinked', handleEvmUnlinked);
    return () => {
      window.removeEventListener('iota-evm-linked', handleEvmLinked);
      window.removeEventListener('iota-evm-unlinked', handleEvmUnlinked);
    };
  }, [displayQuery]);

  // Resolve linked TON address for .iota profiles
  useEffect(() => {
    const name = normalizeIotaQuery(displayQuery);
    if (!name) {
      setLinkedTonAddress(null);
      linkedTonResolverRef.current = null;
      return;
    }

    const resolverKey = `${name}|ton`;
    if (linkedTonResolverRef.current === resolverKey) return;
    linkedTonResolverRef.current = resolverKey;

    let isCancelled = false;

    const resolve = async () => {
      try {
        // Check localStorage first
        const localTon = localStorage.getItem(`iota-linked-ton:${name}`);
        if (localTon) {
          setLinkedTonAddress(localTon);
        }

        // Query DB
        const { data, error } = await supabase.functions.invoke('get-iota-linked-ton', {
          body: { iotaName: name },
        });

        if (!isCancelled && data?.success && data?.tonAddress) {
          console.log(`✅ Linked TON from DB for ${name}: ${data.tonAddress}`);
          setLinkedTonAddress(data.tonAddress);
          try { localStorage.setItem(`iota-linked-ton:${name}`, data.tonAddress); } catch {}
        } else if (!isCancelled && !localTon) {
          setLinkedTonAddress(null);
        }
      } catch (err) {
        console.warn('[SearchInterface] TON link resolution failed:', err);
      }
    };

    resolve();
    return () => { isCancelled = true; };
  }, [displayQuery]);

  // Listen for real-time 'iota-ton-linked' events
  useEffect(() => {
    const handleTonLinked = (event: Event) => {
      const { iotaName: linkedName, tonAddress } = (event as CustomEvent).detail || {};
      const currentName = displayQuery?.toLowerCase()?.trim();
      if (linkedName === currentName && tonAddress) {
        console.log(`🔗 Real-time TON link event for ${linkedName}: ${tonAddress}`);
        setLinkedTonAddress(tonAddress);
      }
    };
    window.addEventListener('iota-ton-linked', handleTonLinked);
    return () => window.removeEventListener('iota-ton-linked', handleTonLinked);
  }, [displayQuery]);

  // Preload NFTs in background when profile loads (use linkedEvmAddress for IOTA)
  useEffect(() => {
    const isIota = isIotaName(displayQuery);
    const address = isIota ? linkedEvmAddress : web3BioProfile?.address;
    const isValidAddress = address && 
                          address !== 'undefined' && 
                          typeof address === 'string' && 
                          address.trim() !== '' &&
                          /^0x[a-fA-F0-9]{40}$/i.test(address);
    
    if (isValidAddress && nfts.length === 0 && !nftLoading) {
      console.log('🔄 Background: Preloading OpenSea NFTs for address:', address);
      const timer = setTimeout(() => {
        fetchNfts(address, undefined);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [web3BioProfile?.address, linkedEvmAddress, displayQuery]);

  // Fetch EFP stats for .iota profiles when linkedEvmAddress resolves
  useEffect(() => {
    if (!isIotaName(displayQuery) || !linkedEvmAddress || !/^0x[a-fA-F0-9]{40}$/i.test(linkedEvmAddress)) return;
    if (efpStats) return; // Already have stats

    console.log('🔄 Fetching EFP stats for linked EVM on .iota profile:', linkedEvmAddress);
    supabase.functions.invoke('get-efp-stats', {
      body: { address: linkedEvmAddress }
    }).then(({ data: efpData }) => {
      if (efpData && (efpData.followers_count > 0 || efpData.following_count > 0)) {
        console.log('✅ EFP stats loaded for .iota linked EVM:', efpData);
        setEfpStats(efpData);
      }
    }).catch(err => console.log('EFP stats fetch failed for .iota linked EVM:', err));
  }, [linkedEvmAddress, displayQuery, efpStats]);

  // Preload POAPs in background when profile loads (use linkedEvmAddress for IOTA)
  useEffect(() => {
    const isIota = isIotaName(displayQuery);
    const poapAddress = isIota ? linkedEvmAddress : web3BioProfile?.address;
    
    if (poapAddress && /^0x[a-fA-F0-9]{40}$/i.test(poapAddress) && poapTokens.length === 0 && !isLoadingPoaps) {
      console.log('🔄 Background: Ensuring POAPs are loaded for:', poapAddress);
      const loadPoaps = async () => {
        try {
          setIsLoadingPoaps(true);
          setPoapOffset(0);
          
          const { data: poapData, error: poapError } = await supabase.functions.invoke("get-poap-data", {
            body: { walletAddress: poapAddress, offset: 0, limit: 1000 },
          });

          if (!poapError && poapData?.success) {
            setPoapCount(poapData.count || 0);
            setPoapTotalCount(poapData.totalCount || poapData.count || 0);
            setPoapHasMore(poapData.hasMore || false);
            setPoapOffset(poapData.count || 0);
            
            if (poapData.poaps && Array.isArray(poapData.poaps)) {
              setPoapTokens(poapData.poaps.map((poap: any) => ({
                eventId: poap.event?.id,
                eventName: poap.event?.name,
                eventDescription: poap.event?.description,
                eventImageUrl: poap.event?.image_url,
                eventStartDate: poap.event?.start_date,
                eventEndDate: poap.event?.end_date,
                eventYear: poap.event?.year,
                tokenId: poap.tokenId,
                owner: poap.owner,
                chain: poap.chain,
                __mintDate: poap.__mintDate,
                __bestDate: poap.__bestDate,
                created: poap.created,
              })));
              console.log(`✅ Background: Loaded ${poapData.poaps.length} POAPs (total: ${poapData.totalCount}, hasMore: ${poapData.hasMore})`);
            }
          }
        } catch (error) {
          console.log('Background: POAP preload failed', error);
        } finally {
          setIsLoadingPoaps(false);
        }
      };
      
      const timer = setTimeout(loadPoaps, 500);
      return () => clearTimeout(timer);
    }
  }, [web3BioProfile?.address, linkedEvmAddress, displayQuery]);

  // Load IOTA onchain profile when viewing ANY .iota domain or subdomain
  // Auto-link domain for messaging when viewing any profile
  useEffect(() => {
    if (displayQuery && web3BioProfile) {
      setLinkedDomain(displayQuery);
    }
  }, [displayQuery, web3BioProfile]);

  useEffect(() => {
    const loadIotaOnchainProfile = async () => {
      const name = displayQuery?.toLowerCase()?.trim();

      // Works for ALL .iota names + subdomains
      if (!isIotaName(name)) {
        setIotaOnchainProfile(null);
        setIotaNameObjectId(null);
        setIotaOwnerAddress(null);
        return;
      }

      // Always fetch fresh .iota profile data (no caching)
      console.log('🔄 Loading IOTA onchain profile for:', name);
      setIotaOnchainProfileLoading(true);

      try {
        const response = await fetchIotaOnchainProfile(name);

        if (response?.success) {
          setIotaOnchainProfile(response.profile);
          setIotaNameObjectId(response.nameObjectId);
          setIotaOwnerAddress(response.ownerAddress);
          console.log('✅ IOTA onchain profile loaded:', response);
        } else {
          console.log('⚠️ IOTA onchain profile not found:', response.message);
          setIotaOnchainProfile(null);
          setIotaNameObjectId(null);
          setIotaOwnerAddress(response.ownerAddress || null);
        }
      } catch (error) {
        console.error('❌ Failed to load IOTA onchain profile:', error);
        setIotaOnchainProfile(null);
        setIotaNameObjectId(null);
        setIotaOwnerAddress(null);
      } finally {
        setIotaOnchainProfileLoading(false);
      }
    };

    loadIotaOnchainProfile();
  }, [displayQuery]);

  const protocols = ["DNS", "ENS"];
  const clubs = ["Crypto", "DeFi", "Dev", "Digits", "Letters", "Surname", "Startup", "Artist", "Misc", "Gaming", "Personal"];

  // Auto-search when username is in URL (including back/forward navigation)
  useEffect(() => {
    if (username) {
      const currentProfile = displayQuery?.toLowerCase();
      const urlProfile = username.toLowerCase();
      
      if (currentProfile !== urlProfile) {
        console.log('🔗 URL profile detected:', username);
        setSearchQuery(username);
        setIsHomepage(false);
        setTimeout(() => {
          handleSearch(username);
        }, 100);
      }
    } else if (location.pathname === '/') {
      // Back button to home — reset state
      if (displayQuery || web3BioProfile || isSearchActive) {
        setShowSearchBar(false);
        setHadPreviousProfile(false);
        setWeb3BioProfile(null);
        setEfpStats(null);
        setEnsRecords(null);
        setIsSearchActive(false);
        setHasSearched(false);
        setSearchQuery('');
        setDisplayQuery('');
        setEnsResults([]);
        setNfts([]);
        setPoapTokens([]);
        setActiveDockSection('profile');
        setIsHomepage(true);
        setShowDetailView(false);
        setDetailViewResult(null);
      }
    }
  }, [username, location.pathname]);

  // Show homepage initially - no need to set hasSearched since it's initialized as true

  // Re-fetch results when language changes
  useEffect(() => {
    if (hasSearched && ensResults.length > 0) {
      const allResults = getAllResults();
      if (filters.protocol.length === 0 && filters.club.length === 0) {
        setEnsResults(allResults);
      } else {
        const filteredResults = allResults.filter((result) => {
          const categories = Array.isArray(result.category) ? result.category : [result.category];
          const clubs = Array.isArray(result.club) ? result.club : [result.club];

          const protocolMatch = filters.protocol.length === 0 || filters.protocol.some((p) => categories.includes(p));
          const clubMatch = filters.club.length === 0 || filters.club.some((c) => clubs.includes(c));
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
    setHasManuallyAdjustedFilters(true);
    const newProtocols = filters.protocol.includes(protocol)
      ? filters.protocol.filter((p) => p !== protocol)
      : [...filters.protocol, protocol];

    setFilters({
      ...filters,
      protocol: newProtocols,
    });
  };

  const handleClubToggle = (club: string) => {
    setHasManuallyAdjustedFilters(true);
    let newClubs = [...filters.club];
    
    if (newClubs.includes(club)) {
      newClubs = newClubs.filter((c) => c !== club);
    } else {
      newClubs = [...newClubs, club];
    }

    setFilters({
      ...filters,
      club: newClubs,
    });
  };

  const handleClearFilters = () => {
    setHasManuallyAdjustedFilters(true);
    // Select all clubs when X is pressed
    setFilters({ protocol: [], club: clubs });
    // Keep dropdown open - don't close it
  };

  const handleApplyFilters = () => {
    // Only re-filter if we already have results from a search
    if (hasSearched && ensResults.length > 0) {
      handleSearch();
    }
    setShowFilterDropdown(false);
  };

  const getAllResults = () => {
    const allResults = [
      {
        name: "Smith.cash",
        description: t("desc_smith_cash"),
        imageUrl: smithCashAvatar,
        price: 5,
        category: ["ENS", "DNS"],
        club: ["Surname", "DeFi"],
      },
      {
        name: "Smith.box",
        description: t("desc_smith_cash"),
        imageUrl: smithBoxAvatar,
        price: 5,
        category: ["ENS", "DNS"],
        club: ["Surname", "DeFi"],
        enabled: false,
      },
      {
        name: "Vape.box",
        description: t("desc_vape_box"),
        imageUrl: vapeBoxAvatar,
        price: 5,
        category: ["ENS", "DNS"],
        club: ["Startup"],
        enabled: false,
      },
      {
        name: "altcoin.chain",
        description: t("desc_altcoin_chain"),
        imageUrl: termuxAvatar,
        price: 5,
        category: ["ENS", "DNS"],
        club: ["Crypto", "DeFi"],
        enabled: false,
      },
      {
        name: "Vanity.ton",
        description: "Telegram-native Web3 identity on TON blockchain",
        imageUrl: vanityTonAvatar,
        price: 5,
        category: ["TON"],
        club: ["Personal"],
        selectable: true,
        enabled: false,
      },
      {
        name: "Vanity.apt",
        description: "Native Web3 ID for the Aptos blockchain.",
        imageUrl: vanityAptAvatar,
        price: 5,
        category: ["Aptos"],
        club: ["Personal"],
        selectable: true,
        enabled: true,
      },
      {
        name: "Smith.apt",
        description: "Professional surname identity on Aptos blockchain",
        imageUrl: smithAptAvatar,
        price: 5,
        category: ["Aptos"],
        club: ["Surname"],
        selectable: true,
        enabled: true,
      },
      {
        name: "Vanity.hl",
        description: "Native Web3 ID for the HyperLiquid blockchain.",
        imageUrl: vanityHlAvatar,
        price: 5,
        category: ["DNS"],
        club: ["Personal"],
        selectable: true,
        enabled: false,
      },
      {
        name: "Vanity.box",
        description: "Premium Ethereum identity with DNS and ENS features",
        imageUrl: vanityBoxAvatar,
        price: 5,
        category: ["ENS", "DNS"],
        club: ["Personal"],
        selectable: true,
        enabled: false,
      },
      {
        name: "Vanity.vet",
        description: "Veterinary and VeChain-inspired Web3 identity",
        imageUrl: vanityVetAvatar,
        price: 5,
        category: ["DNS"],
        club: ["Personal"],
        selectable: true,
        enabled: false,
      },
      {
        name: "Vanity.iota",
        description: "IoT-native identity on the IOTA blockchain",
        imageUrl: vanityIotaAvatar,
        price: 5,
        category: ["DNS"],
        club: ["Personal"],
        selectable: true,
        enabled: false,
      },
      {
        name: "30315.eth",
        description: t("desc_30315"),
        imageUrl: eth30315Avatar,
        price: 1,
        category: "ENS",
        club: "Digits",
        selectable: true,
        enabled: true,
      },
      {
        name: "MexiPay.eth",
        description: t("desc_mexipay"),
        imageUrl: mexipayAvatar,
        price: 5,
        category: "ENS",
        club: "DeFi",
        selectable: true,
        enabled: true,
      },
      {
        name: "GuavaPay.eth",
        description: t("desc_guavapay"),
        imageUrl: guavapayAvatar,
        price: 5,
        category: "ENS",
        club: "DeFi",
        selectable: true,
        enabled: true,
      },
      {
        name: "TeamXRP.eth",
        description: t("desc_teamxrp"),
        imageUrl: teamxrpAvatar,
        price: 5,
        category: "ENS",
        club: "Crypto",
        selectable: true,
        enabled: true,
      },
      {
        name: "$mith.eth",
        description: t("desc_smith"),
        imageUrl: mithEthAvatar,
        price: 5,
        category: "ENS",
        club: ["Surname", "DeFi"],
      },
      {
        name: "Termux.eth",
        description: t("desc_termux"),
        imageUrl: termuxAvatar,
        price: 5,
        category: "ENS",
        club: "Dev",
        selectable: true,
        enabled: true,
      },
      {
        name: "Spyda.eth",
        description: t("desc_spyda"),
        imageUrl: spydaAvatar,
        price: 5,
        category: "ENS",
        club: "Artist",
        spotifyUrl:
          "https://open.spotify.com/playlist/37i9dQZF1DZ06evO07i78t?si=O-Wk41qlRAy-6TdqfdteKw&pi=dIp1RP4rQBOjD&nd=1&utm_source=copy-link&utm_medium=sharing",
        selectable: true,
        enabled: true,
      },
      {
        name: "FlirtaD.eth",
        description: t("desc_flirtad"),
        imageUrl: flirtadAvatar,
        price: 5,
        category: "ENS",
        club: "Artist",
        spotifyUrl:
          "https://open.spotify.com/playlist/37i9dQZF1DZ06evO1xveQU?si=DjldB-b-S569AvJ1maoCIw&pi=377GPKjeQfSgE&nd=1&utm_source=copy-link&utm_medium=sharing",
        selectable: true,
        enabled: true,
      },
    ];
    // Return all results - we'll handle enabled status in the UI
    return allResults;
  };

  const handleSearch = async (queryOverride?: string) => {
    const trimmedQuery = (queryOverride || searchQuery).trim();
    // Require a search query - we only show subdomain results, not parent domains
    if (!trimmedQuery) return;

    console.log("Search start", { query: trimmedQuery });
    setShowFilterDropdown(false);
    setShowSearchBar(false); // Close search overlay immediately when search begins
    setIsHomepage(false);
    // Reset detail view state to fix glitch
    setShowDetailView(false);
    setDetailViewResult(null);

    // Prevent searches with spaces
    if (trimmedQuery.includes(" ")) {
      return;
    }

    // Special test mode: show all domains for subdomain minting
    if (trimmedQuery.toLowerCase() === "test321") {
      console.log("🔧 Test mode activated: showing all domains for subdomain minting");
      setDisplayQuery(trimmedQuery);
      setIsLoading(true);
      setHasSearched(true);
      setIsSearchActive(true);
      setShowInitialResults(true);
      setWeb3BioProfile(null);
      setEfpStats(null);
      setEnsRecords(null);
      setTakenSubdomains(new Set());
      (window as any).__checkFailedDomains = new Set();
      
      // Get all results and show them all
      const allResults = getAllResults();
      allResults.sort((a, b) => a.name.localeCompare(b.name));
      setEnsResults(allResults);
      setIsLoading(false);
      return;
    }

    // Max character limit varies by query type:
    // - Wallet addresses: 42 chars (0x + 40 hex)
    // - Domain-style lookups with dots (.vanity, .eth, etc.): 63 chars
    // - Regular names without dots: 12 chars
    const hasDot = trimmedQuery.includes('.');
    const isPotentialWallet = trimmedQuery.startsWith('0x') && /^0x[a-fA-F0-9]+$/i.test(trimmedQuery);
    const isIotaAddr = isValidIotaAddress(trimmedQuery);

    let maxLength = 12; // Default for regular names
    if (isPotentialWallet || isIotaAddr) {
      maxLength = 70; // Allow wallet addresses (EVM 42 chars, IOTA 66 chars + buffer)
    } else if (hasDot) {
      maxLength = 63; // Allow full domain lookups like afrobeat.vanity
    }
    
    if (trimmedQuery.length > maxLength) {
      setEnsResults([]);
      setWeb3BioProfile(null);
      setEfpStats(null);
      setEnsRecords(null);
      setDisplayQuery(trimmedQuery);
      setIsLoading(false);
      setHasSearched(true);
      setIsSearchActive(true);
      return;
    }
...
            <div className="w-full sm:max-w-3xl sm:mx-auto px-4">
              {!isHomepage && hasSearched && ensResults.length === 0 && !web3BioProfile && !isLoading && !showMyIDs && (
                <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-500">
                  <h3 className="text-xl font-semibold text-foreground mb-2">{t('no_results_found')}</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mb-4">{t('try_different_query')}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      

      {/* Detail View Modal */}
      {showDetailView && detailViewResult && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-background border border-border rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            {/* Back Button */}
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowDetailView(false);
                  setDetailViewResult(null);
                }}
                className="flex-shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-lg font-bold text-foreground">Domain Details</h2>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Avatar */}
              <div className="flex justify-center">
                <img
                  src={detailViewResult.imageUrl || smithCashAvatar}
                  alt={detailViewResult.name}
                  className="w-48 h-48 rounded-full object-cover ring-4 ring-border/30"
                  onError={(e) => {
                    e.currentTarget.src = smithCashAvatar;
                  }}
                />
              </div>

              {/* Name */}
              <div className="text-center">
                <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] bg-clip-text text-transparent mb-2">
                  {displayQuery ? `${displayQuery}.${detailViewResult.name}` : detailViewResult.name}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {Array.isArray(detailViewResult.category) ? detailViewResult.category.join('+') : detailViewResult.category}
                </p>
              </div>

              {/* Description */}
              {detailViewResult.description && (
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-foreground/80 text-center leading-relaxed">
                    {detailViewResult.description}
                  </p>
                </div>
              )}

              {/* Action Button */}
              <Button
                variant={detailViewResult.enabled === false ? "secondary" : "default"}
                size="lg"
                className="w-full font-semibold text-lg py-6"
                disabled={detailViewResult.enabled === false}
                onClick={() => {
                  if (detailViewResult.enabled !== false) {
                    setShowDetailView(false);
                    handleMint(detailViewResult);
                  }
                }}
              >
                {detailViewResult.enabled === false ? "Coming Soon" : "Mint Now"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
