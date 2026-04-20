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

  // Cross-chain overlay: when an external domain (e.g. .eth) resolves to an EVM address
  // that has been linked to a vanity.iota profile, we render the IOTA profile but keep
  // the searched domain's identity, displayName, avatar and header on top.
  const [ensOverlay, setEnsOverlay] = useState<{
    identity: string;
    displayName: string | null;
    avatar: string | null;
    header: string | null;
    platform: string;
  } | null>(null);

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

    // Auto-select all filters when searching, unless user has manually adjusted them
    if (!hasManuallyAdjustedFilters) {
      setFilters({ protocol: [], club: clubs });
    }

    // Only show search results and clear previous data when actually searching
    // Instantly clear previous results
    setEnsResults([]);
    setWeb3BioProfile(null);
    setEfpStats(null);
    setEnsRecords(null);
    setEnsOverlay(null);

    // Update the display query to match what's being searched
    setDisplayQuery(trimmedQuery);

    // Update URL to reflect the current search
    const urlPath = `/${encodeURIComponent(trimmedQuery)}`;
    if (location.pathname !== urlPath) {
      navigate(urlPath, { replace: false });
    }
    setIsLoading(true);
    setHasSearched(true);
    setIsSearchActive(true);

    // Check if query is a valid wallet address (EVM: 40 hex, IOTA: 64 hex)
    const isEvmWallet = trimmedQuery && /^0x[a-fA-F0-9]{40}$/i.test(trimmedQuery);
    const isWalletAddress = isEvmWallet || isIotaAddr;

    console.log("🔍 Query analysis:", {
      query: trimmedQuery,
      isWalletAddress,
      isIotaAddr,
      hasDot: trimmedQuery?.includes("."),
      length: trimmedQuery?.length
    });

    // Normalize wallet address to checksummed format if it's an EVM wallet address
    let normalizedAddress = trimmedQuery;
    if (isEvmWallet) {
      try {
        normalizedAddress = getAddress(trimmedQuery.toLowerCase());
        console.log("✅ Checksummed address:", normalizedAddress);
      } catch (err) {
        console.log("⚠️ Using original address format:", trimmedQuery);
        normalizedAddress = trimmedQuery;
      }
    } else if (isIotaAddr) {
      normalizedAddress = trimmedQuery.toLowerCase();
      console.log("✅ IOTA address detected:", normalizedAddress);
    }

    // If query has no dot and is not a wallet address, redirect to Unstoppable Domains
    if (trimmedQuery && !trimmedQuery.includes(".") && !isWalletAddress) {
      window.open(`https://get.unstoppabledomains.com/vanity/?searchTerm=${encodeURIComponent(trimmedQuery)}&searchRef=vanitybox`, '_blank');
      setIsLoading(false);
      setIsHomepage(true);
      setIsSearchActive(false);
      return;
    }

    // If query contains a dot OR is a wallet address, try fetching profile using unified resolver
    if (trimmedQuery && (trimmedQuery.includes(".") || isWalletAddress)) {
      const normalizedQuery = trimmedQuery.toLowerCase();
      const currentSearchId = ++searchIdRef.current;
      
      console.log(`🔍 Using client-side profile resolver for: ${isWalletAddress ? normalizedAddress : normalizedQuery}`);
      
      try {
        // Use client-side profile resolution with public APIs (no edge function needed)
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Profile lookup timed out')), 20000)
        );
        
        // Import the resolver functions inline to avoid circular dependencies
        const { resolveProfileDirect } = await import('@/hooks/useProfileResolver');
        
        const resolverPromise = resolveProfileDirect(isWalletAddress ? normalizedAddress : normalizedQuery);

        // For .iota names, fire the onchain profile fetch in parallel with resolver
        let iotaOnchainPromise: Promise<any> | null = null;
        if (isIotaName(normalizedQuery)) {
          // Always fetch fresh .iota profile
          iotaOnchainPromise = fetchIotaOnchainProfile(normalizedQuery);
        }
        
        const resolverData = await Promise.race([
          resolverPromise,
          timeoutPromise.then(() => { throw new Error('timeout'); })
        ]);

        // If we started a parallel IOTA onchain fetch, apply results now
        if (iotaOnchainPromise) {
          iotaOnchainPromise.then(response => {
            if (response?.success) {
              // No caching for .iota profiles
              setIotaOnchainProfile(response.profile);
              setIotaOnchainProfile(response.profile);
              setIotaNameObjectId(response.nameObjectId);
              setIotaOwnerAddress(response.ownerAddress);
              setIotaOnchainProfileLoading(false);
            }
          });
        }
        
        // Check if this search is still current
        if (searchIdRef.current !== currentSearchId) {
          console.log('🚫 Search result discarded - newer search started');
          return;
        }
        
        console.log('📥 Client resolver response:', { 
          ok: resolverData?.ok, 
          source: resolverData?.source, 
          debug: resolverData?.debug 
        });
        
        if (!resolverData?.ok || !resolverData?.profile) {
          console.log('⚠️ No profile found:', resolverData?.notFound ? 'not found' : 'unknown error');
          
          // For wallet addresses, create minimal profile even if resolver fails
          if (isWalletAddress && normalizedAddress) {
            console.log('🔄 Creating minimal profile for wallet address:', normalizedAddress);
            const minimalProfile = {
              displayName: null,
              address: normalizedAddress,
              avatar: null,
              description: null,
              platform: isIotaAddr ? 'iota' : 'ethereum',
              identity: normalizedAddress,
              links: {},
            };
            setWeb3BioProfile(minimalProfile);
            setEnsResults([]);
            
            // Fetch EFP stats and NFTs
            supabase.functions.invoke('get-efp-stats', {
              body: { address: normalizedAddress }
            }).then(({ data: efpData }) => {
              if (efpData && (efpData.followers_count > 0 || efpData.following_count > 0)) {
                setEfpStats(efpData);
              }
            }).catch(() => {});
            
            fetchNfts(normalizedAddress, undefined);
          } else if (!resolverData?.notFound) {
            toast.error("Profile lookup failed. Please try again.");
          }

          // Not found (or other non-profile response) — stop the blocking loader.
          if (searchIdRef.current === currentSearchId) setIsLoading(false);
          return;
        }
        
        // Profile found - set it
        const profile = resolverData.profile;
        console.log('✅ Profile loaded:', { 
          source: resolverData.source, 
          identity: profile.identity,
          address: profile.address 
        });
        
        setWeb3BioProfile(profile);
        setEnsResults([]);
        
        if (profile.ensRecords) {
          setEnsRecords(profile.ensRecords);
        }

        // For IOTA address reverse lookups: the resolver found an iotaDomain but we
        // didn't fire the onchain profile fetch earlier (query wasn't a .iota name).
        // Fetch it now so the profile card renders full IOTA data.
        if (!iotaOnchainPromise && profile.iotaDomain && isIotaName(profile.iotaDomain)) {
          setIotaOnchainProfileLoading(true);
          fetchIotaOnchainProfile(profile.iotaDomain).then(response => {
            if (response?.success) {
              setIotaOnchainProfile(response.profile);
              setIotaNameObjectId(response.nameObjectId);
              setIotaOwnerAddress(response.ownerAddress);
            }
            setIotaOnchainProfileLoading(false);
          }).catch(() => setIotaOnchainProfileLoading(false));

          // Also update the URL to the .iota domain for cleaner navigation
          const iotaPath = `/${encodeURIComponent(profile.iotaDomain)}`;
          if (location.pathname !== iotaPath) {
            navigate(iotaPath, { replace: true });
          }
          setDisplayQuery(profile.iotaDomain);
        }

        // Cross-chain overlay: if a non-IOTA domain (e.g. .eth) resolves to an EVM
        // address that is linked to a vanity.iota profile, render the IOTA profile
        // but keep the searched domain's avatar/header/displayName/identity on top.
        const queryIsIotaName = isIotaName(normalizedQuery);
        const queryIsIotaAddr = isIotaAddr;
        const profileAlreadyIota =
          profile.platform === 'iota' || (profile.iotaDomain && isIotaName(profile.iotaDomain));
        if (
          !queryIsIotaName &&
          !queryIsIotaAddr &&
          !profileAlreadyIota &&
          profile.address &&
          isValidEvmAddress(profile.address)
        ) {
          (async () => {
            try {
              const { data: linked } = await supabase.functions.invoke('get-iota-name-by-evm', {
                body: { evmAddress: profile.address },
              });
              if (searchIdRef.current !== currentSearchId) return;
              const iotaName: string | null = linked?.iotaName || null;
              if (!iotaName || !isIotaName(iotaName)) return;

              console.log(`🔗 Cross-chain: ${profile.identity} -> linked .iota: ${iotaName}`);

              // Capture the searched ENS/EVM-domain branding as overlay
              setEnsOverlay({
                identity: profile.identity || normalizedQuery,
                displayName: profile.displayName || profile.identity || normalizedQuery,
                avatar: profile.avatar || null,
                header: profile.header || null,
                platform: profile.platform || 'ens',
              });

              // Switch the active query to the .iota name so the IOTA profile flow renders.
              // We intentionally do NOT navigate the URL — the user stays on the searched domain.
              setDisplayQuery(iotaName);
              setIotaOnchainProfileLoading(true);
              try {
                const response = await fetchIotaOnchainProfile(iotaName);
                if (searchIdRef.current !== currentSearchId) return;
                if (response?.success) {
                  setIotaOnchainProfile(response.profile);
                  setIotaNameObjectId(response.nameObjectId);
                  setIotaOwnerAddress(response.ownerAddress);
                }
              } finally {
                if (searchIdRef.current === currentSearchId) setIotaOnchainProfileLoading(false);
              }
            } catch (err: any) {
              console.log('Cross-chain iota link lookup failed:', err?.message || err);
            }
          })();
        }

        // Fetch additional data for Dock (non-blocking)
        if (profile.address) {
          // Fetch EFP stats
          supabase.functions.invoke('get-efp-stats', {
            body: { address: profile.address }
          }).then(({ data: efpData }) => {
            if (efpData && (efpData.followers_count > 0 || efpData.following_count > 0)) {
              console.log('✅ EFP stats loaded:', efpData);
              setEfpStats(efpData);
            }
          }).catch(err => console.log('EFP stats fetch failed:', err));

          // Fetch OpenSea NFTs only for non-IOTA profiles with valid EVM addresses
          if (!isIotaName(normalizedQuery) && isValidEvmAddress(profile.address)) {
            fetchNfts(profile.address, undefined);
          }
        }
      } catch (error: any) {
        // Check if this search is still current
        if (searchIdRef.current !== currentSearchId) {
          console.log('🚫 Error discarded - newer search started');
          return;
        }
        
        console.log("❌ Profile lookup failed:", error?.message || error);
        
        // For wallet addresses, create minimal profile on timeout/error
        if (isWalletAddress && normalizedAddress) {
          console.log('🔄 Timeout/error fallback: Creating minimal profile for wallet');
          const minimalProfile = {
            displayName: null,
            address: normalizedAddress,
            avatar: null,
            description: null,
            platform: isIotaAddr ? 'iota' : 'ethereum',
            identity: normalizedAddress,
            links: {},
          };
          setWeb3BioProfile(minimalProfile);
          setEnsResults([]);
          if (!isIotaAddr) fetchNfts(normalizedAddress, undefined);
        } else {
          toast.error("Profile lookup timed out. Please try again.");
        }

        // Prevent the loading progress from getting stuck at 98%
        if (searchIdRef.current === currentSearchId) setIsLoading(false);
        return;
      } finally {
        // Always set loading to false when profile resolution completes or fails
        if (searchIdRef.current === currentSearchId) {
          // Profile resolution done - continue to subdomain checks if needed
        }
      }
    }


    // Fetch user's domains if wallet is connected
    if (walletAddress) {
      try {
        const { data: domainsData } = await supabase.functions.invoke("get-user-domains", {
          body: { walletAddress },
        });
        if (domainsData?.domains) {
          setUserDomains(domainsData.domains.map((d: any) => `${d.name}.${d.domain}`.toLowerCase()));
        }
      } catch (error) {
        console.error("Error fetching user domains:", error);
      }
    }

    // Namestone availability checks removed — show all results, mark none as taken.
    let allResults = getAllResults();
    setShowInitialResults(true);
    setTakenSubdomains(new Set());
    (window as any).__checkFailedDomains = new Set();

    await new Promise((resolve) => setTimeout(resolve, 250));

    // Filter results
    let filteredResults = allResults;

    // Apply protocol and club filters if any are selected
    // Check if all clubs are selected
    const allClubsSelected = filters.club.length === clubs.length && 
      clubs.every(c => filters.club.includes(c));
    
    if (filters.protocol.length > 0 || (filters.club.length > 0 && !allClubsSelected)) {
      filteredResults = allResults.filter((result) => {
        const categories = Array.isArray(result.category) ? result.category : [result.category];
        const resultClubs = Array.isArray(result.club) ? result.club : [result.club];

        const protocolMatch = filters.protocol.length === 0 || filters.protocol.some((p) => categories.includes(p));
        const clubMatch = allClubsSelected || filters.club.length === 0 || filters.club.some((c) => resultClubs.includes(c));
        return protocolMatch && clubMatch;
      });
    } else {
      // If no filters are applied or all clubs selected, show all available subdomains
      filteredResults = allResults;
    }

    // Sort results alphabetically by name
    filteredResults.sort((a, b) => a.name.localeCompare(b.name));

    setEnsResults(filteredResults);
    console.log("Results set", filteredResults.length);

    if (searchQuery) {
      setIsAvailable(!searchQuery.toLowerCase().includes("taken"));
    }
    setIsLoading(false);
  };


  // Fetch functions for dock sections
  const fetchNfts = async (addressOverride?: string, next?: string) => {
    const address = addressOverride || web3BioProfile?.address || walletAddress;
    
    // Sanitize the next parameter to handle MiniKit undefined objects
    const sanitizedNext = (next && typeof next === 'string' && next !== 'undefined') 
      ? next 
      : (next && typeof next === 'object' && (next as any)?._type === 'undefined')
        ? undefined
        : next;
    
    console.log('fetchNfts called with:', { 
      address, 
      addressOverride,
      web3BioProfile: web3BioProfile?.address, 
      walletAddress, 
      next,
      sanitizedNext 
    });
    
    // Check for undefined, null, empty string, or MiniKit's undefined object format
    if (!address || 
        address === 'undefined' || 
        (typeof address === 'object' && (address as any)?._type === 'undefined') ||
        (typeof address === 'string' && address.trim() === '')) {
      console.warn('Cannot fetch NFTs: No valid wallet address available', { address });
      setNftLoading(false);
      return;
    }
    
    const addressString = typeof address === 'string' ? address : (address as any)?.value;
    if (!addressString || addressString === 'undefined' || addressString.trim() === '') {
      console.warn('Cannot fetch NFTs: Invalid address format', { address, addressString });
      setNftLoading(false);
      return;
    }
    
    if (!isValidEvmAddress(addressString)) {
      console.warn('Skipping OpenSea fetch for non-EVM address:', addressString);
      setNftLoading(false);
      return;
    }

    console.log('Fetching NFTs with valid EVM address:', addressString);
    
    try {
      
      // Final validation before API call - if this fails, abort gracefully
      if (!addressString || addressString.trim() === '' || addressString === 'undefined') {
        console.error('Cannot call API: Invalid addressString', addressString);
        setNftLoading(false);
        return;
      }
      
      // Build request body with sanitized next parameter
      const requestBody: any = {
        walletAddress: addressString,
        limit: 20,
      };
      
      // Only add next if it's a valid string
      if (sanitizedNext && typeof sanitizedNext === 'string') {
        requestBody.next = sanitizedNext;
      }
      
      console.log('Calling get-opensea-nfts with body:', requestBody);
      
      // Double-check walletAddress is valid before making the call
      if (!requestBody.walletAddress || typeof requestBody.walletAddress !== 'string' || requestBody.walletAddress.trim() === '') {
        console.error('Aborting API call: requestBody.walletAddress is invalid', requestBody.walletAddress);
        setNftLoading(false);
        return;
      }
      
      // Use direct fetch instead of callEdge to fix body serialization issues
      const response = await fetch('https://gdjjboorqviobvvygpca.supabase.co/functions/v1/get-opensea-nfts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkampib29ycXZpb2J2dnlncGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDY1NDIsImV4cCI6MjA3MzEyMjU0Mn0.88t9gQHYr2kWB3P0Prd1ehRTsP3hYemV6PEkOLQa7tE',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkampib29ycXZpb2J2dnlncGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDY1NDIsImV4cCI6MjA3MzEyMjU0Mn0.88t9gQHYr2kWB3P0Prd1ehRTsP3hYemV6PEkOLQa7tE',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenSea API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      // Sanitize the next cursor from the response
      const responseNext = data.next;
      const sanitizedResponseNext = 
        responseNext && 
        typeof responseNext === 'object' && 
        (responseNext as any)?._type === 'undefined'
          ? undefined
          : typeof responseNext === 'string' && 
            responseNext !== 'undefined' && 
            responseNext.trim() !== ''
          ? responseNext
          : undefined;
      
      if (next) {
        setNfts((prev) => [...prev, ...data.nfts]);
      } else {
        setNfts(data.nfts || []);
      }
      setNftNextCursor(sanitizedResponseNext || null);
      
      // Track that OpenSea was attempted and if there were errors
      if (data.attempted) {
        setOpenseaAttempted(true);
      }
      if (data.errorsByChain && Object.keys(data.errorsByChain).length > 0) {
        setOpenseaHasErrors(true);
        console.warn('OpenSea had errors on some chains:', data.errorsByChain);
      } else {
        setOpenseaHasErrors(false);
      }
    } catch (err: any) {
      console.error("Error fetching NFTs:", err);
      setOpenseaAttempted(true);
      setOpenseaHasErrors(true);
      // Don't show error toast if address is invalid - this is expected
      if (!err?.message?.includes('walletAddress is required')) {
        console.error('Unexpected NFT fetch error:', err);
      }
    } finally {
      setNftLoading(false);
    }
  };

  const fetchLatestCast = async () => {
    // Check if we have any valid Farcaster identifier
    const hasFarcasterData = web3BioProfile?.links?.farcaster?.fid || 
                            web3BioProfile?.links?.farcaster?.handle ||
                            web3BioProfile?.identity;
    const address = web3BioProfile?.address || walletAddress;
    
    // Validate address format (handle MiniKit's undefined object)
    const addressString = typeof address === 'string' ? address : (address as any)?.value;
    const hasValidAddress = addressString && 
                           addressString !== 'undefined' && 
                           addressString.trim() !== '' &&
                           !(typeof address === 'object' && (address as any)?._type === 'undefined');
    
    if (!hasFarcasterData && !hasValidAddress) {
      console.warn('Cannot fetch Farcaster casts: No valid identifier available');
      return;
    }

    // Prepare request body, only including defined values
    const requestBody: any = { limit: 1 };
    
    if (web3BioProfile?.links?.farcaster?.handle) {
      requestBody.username = web3BioProfile.links.farcaster.handle;
    } else if (web3BioProfile?.identity && typeof web3BioProfile.identity === 'string') {
      requestBody.username = web3BioProfile.identity;
    }
    
    if (web3BioProfile?.links?.farcaster?.fid) {
      requestBody.fid = web3BioProfile.links.farcaster.fid;
    }
    
    if (hasValidAddress) {
      requestBody.walletAddress = addressString;
    }
    
    // Final check: ensure we have at least one valid identifier
    if (!requestBody.username && !requestBody.fid && !requestBody.walletAddress) {
      console.warn('Cannot call get-farcaster-casts: No valid identifier in request body');
      return;
    }

    try {
      setCastLoading(true);
      console.log('Calling get-farcaster-casts with:', requestBody);
      const data = await callEdge("get-farcaster-casts", requestBody);
      setLatestCast(data.casts?.[0] || null);
    } catch (err) {
      console.error("Error fetching Farcaster cast:", err);
    } finally {
      setCastLoading(false);
    }
  };

  const handleFollowingClick = async () => {
    setShowFollowingList(true);
    
    // Preload following list if not already loaded
    if (followingList.length === 0 && web3BioProfile?.address) {
      setIsLoadingMore(true);
      try {
        const response = await fetch(
          `https://api.ethfollow.xyz/api/v1/users/${web3BioProfile.address}/following?limit=10&offset=0`
        );
        if (response.ok) {
          const data = await response.json();
          const following = data.following || [];
          setFollowingList(following);
          setTotalFollowing(data.following_count || efpStats?.following_count || 0);
          setFollowingPage(0);
        }
      } catch (error) {
        console.error("Error loading following list:", error);
      }
      setIsLoadingMore(false);
    }
  };

  const handleFollowersClick = async () => {
    setShowFollowersList(true);
    
    // Preload followers list if not already loaded
    if (followersList.length === 0 && web3BioProfile?.address) {
      setIsLoadingMore(true);
      try {
        const response = await fetch(
          `https://api.ethfollow.xyz/api/v1/users/${web3BioProfile.address}/followers?limit=10&offset=0`
        );
        if (response.ok) {
          const data = await response.json();
          const followers = data.followers || [];
          setFollowersList(followers);
          setTotalFollowers(data.followers_count || efpStats?.followers_count || 0);
          setFollowersPage(0);
        }
      } catch (error) {
        console.error("Error loading followers list:", error);
      }
      setIsLoadingMore(false);
    }
  };

  const handleLoadMoreNfts = () => {
    if (!nftNextCursor || nftLoading) return;
    
    // For IOTA profiles, use linkedEvmAddress; otherwise use web3BioProfile.address
    const isIota = isIotaName(displayQuery);
    const address = isIota ? linkedEvmAddress : (web3BioProfile?.address || walletAddress);
    const addressString = typeof address === 'string' ? address : (address as any)?.value;
    
    if (!addressString || 
        addressString === 'undefined' || 
        addressString.trim() === '' ||
        !/^0x[a-fA-F0-9]{40}$/i.test(addressString)) {
      console.warn('Cannot load more NFTs: No valid EVM address available');
      return;
    }
    
    fetchNfts(addressString, nftNextCursor);
  };

  const handleLoadMorePoaps = async () => {
    if (!poapHasMore || poapLoadingMore) return;
    const isIota = isIotaName(displayQuery);
    const address = isIota ? linkedEvmAddress : (web3BioProfile?.address || walletAddress);
    if (!address || !/^0x[a-fA-F0-9]{40}$/i.test(address as string)) return;

    setPoapLoadingMore(true);
    try {
      const { data: poapData, error } = await supabase.functions.invoke("get-poap-data", {
        body: { walletAddress: address, offset: poapOffset, limit: 1000 },
      });
      if (!error && poapData?.success && poapData.poaps) {
        const newPoaps = poapData.poaps.map((poap: any) => ({
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
        }));
        setPoapTokens(prev => [...prev, ...newPoaps]);
        setPoapOffset(prev => prev + newPoaps.length);
        setPoapHasMore(poapData.hasMore || false);
        setPoapTotalCount(poapData.totalCount || poapTotalCount);
      }
    } catch (e) {
      console.error('Failed to load more POAPs:', e);
    } finally {
      setPoapLoadingMore(false);
    }
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
    setFlippedCards((prev) => {
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
      {showFilterDropdown && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" />}

      <div className="w-full h-full relative">
        {/* Show mint interface when a result is selected */}
        {showMintInterface && selectedResult ? (
          <>
            <SubdomainMintModal
              isOpen={true}
              onClose={handleBackToResults}
              subdomain={displayQuery ? `${displayQuery}.${selectedResult.name}` : selectedResult.name}
              price={price}
              resultAvatar={selectedResult.imageUrl}
              domain={selectedResult.name.trim().toLowerCase()}
            />
            {/* Dock for mint modal */}
            <div className="fixed bottom-4 left-0 right-0 z-[10001] flex items-center justify-center">
              <Dock
                items={[
                  {
                    icon: <Home className="w-6 h-6 text-[#D4AF37]" />,
                    label: 'Home',
                    onClick: () => {
                      // Clear everything and go home
                      setShowMintInterface(false);
                      setSelectedResult(null);
                      setShowSearchBar(false);
                      setIsSearchActive(false);
                      setEnsResults([]);
                      setHasSearched(false);
                      setDisplayQuery('');
                      setSearchQuery('');
                      setIsHomepage(true);
                      navigate('/', { replace: false });
                    },
                    isActive: false,
                  },
                  {
                    icon: <ArrowLeft className="w-6 h-6 text-[#D4AF37]" />,
                    label: 'Back',
                    onClick: handleBackToResults,
                    isActive: false,
                  },
                ]}
              />
            </div>
          </>
        ) : (
          <>
            <DynamicMetaTags
              username={web3BioProfile?.identity || displayQuery}
              displayName={web3BioProfile?.displayName}
              description={web3BioProfile?.description}
              avatar={web3BioProfile?.avatar}
              banner={web3BioProfile?.header}
            />
            
            {/* Loading Progress Bar */}
            <LoadingProgress isLoading={isLoading && !web3BioProfile} />
            
            {/* Search bar and header - conditional rendering based on search state */}
            {!showMyIDs && !isLoading && (
              <>
                {/* Modal Search Overlay - works for both homepage and profile views */}
                {showSearchBar && (
                  <>
                    {/* Dim overlay - above profile content */}
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[9998] animate-fade-in"
          onClick={() => setShowSearchBar(false)}
        />
                    
                    {/* Centered search modal - above overlay */}
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
                      <div className="w-full max-w-md pointer-events-auto animate-scale-in">
                        {/* Search bar */}
                        <div className="space-y-3">
                          <div className="relative">
                            <Input
                              placeholder={t("Search for a name")}
                              className="h-12 text-sm text-center bg-white dark:bg-gray-900 border-[#D4AF37] focus:border-[#D4AF37] text-gray-900 dark:text-white placeholder-gray-900 dark:placeholder-white px-10"
                              value={searchQuery}
                              onChange={(e) => handleSearchChange(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSearch();
                                  setIsSearchActive(true);
                                  onSearchClick?.();
                                  setShowSearchBar(false);
                                }
                              }}
                              onFocus={() => {
                                setShowFilterDropdown(false);
                              }}
                            />
                            {searchQuery && (
                              <button
                                onClick={() => {
                                  setSearchQuery("");
                                  setIsAvailable(null);
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                aria-label="Clear search"
                              >
                                <X className="w-4 h-4 text-black dark:text-white" />
                              </button>
                            )}
                          </div>
                          <Button
                            onClick={() => {
                              handleSearch();
                              setIsSearchActive(true);
                              onSearchClick?.();
                              setShowSearchBar(false);
                              window.dispatchEvent(new CustomEvent('close-poap-modal'));
                            }}
                            className="w-full h-12 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold text-base flex items-center justify-center"
                            disabled={!searchQuery.trim() || isLoading}
                          >
                            <Search className="w-5 h-5 mr-2" />
                            {t('search') || 'Search'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {!isSearchActive ? (
                  <>
                    {/* Feature Showcase - Only show when on homepage */}
                    {isHomepage && !web3BioProfile && !showSearchBar && (
                      <div 
                        className="fixed left-0 right-0 z-[9996] overflow-y-auto bg-background"
                        style={{ 
                          top: 'calc(env(safe-area-inset-top, 0px) + 64px)', 
                         bottom: 0
                        }}
                      >
                        <HomeFeatureShowcase />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Remove h1 header when showing user profile */}
                    {!web3BioProfile && (
                      <div className="mt-2">
                        {isLoading ? (
                          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-2">
                            <span className="text-black dark:text-white animate-pulse">{t('loading')}</span>
                          </h1>
                        ) : null}
                      </div>
                    )}
                   </>
                )}
              </>
            )}

            {/* Loading progress bar for .iota profiles while IPFS data loads */}
            {isIotaName(displayQuery) && iotaOnchainProfileLoading && !iotaOnchainProfile && web3BioProfile && !showMyIDs && (
              <LoadingProgress isLoading={true} />
            )}

            {/* Profile Card - fixed positioning regardless of search bar */}
            {web3BioProfile && !showMyIDs && !(isIotaName(displayQuery) && iotaOnchainProfileLoading && !iotaOnchainProfile) ? (
              <div
                className="fixed left-0 right-0 top-[80px] bottom-0 md:bottom-[140px] px-0 pt-0 flex flex-col z-[9997]"
              >
                {/* Profile Card - no scroll within profile */}
                <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
                  <ProfileCard
                    activeSection={activeDockSection}
                    web3BioProfile={
                      isIotaName(displayQuery) && iotaOnchainProfile
                        ? makeIotaDisplayProfile({
                            base: web3BioProfile,
                            iotaOnchainProfile,
                            identity: displayQuery,
                            ownerAddress: iotaOwnerAddress,
                          })
                        : web3BioProfile
                    }
                    currentWalletAddress={
                      isIotaName(displayQuery) && iotaOnchainProfile
                        ? (iotaOwnerAddress || web3BioProfile.address)
                        : web3BioProfile.address
                    }
                    connectedWalletAddress={
                      isIotaName(displayQuery) && isIotaConnected && iotaWalletAddress
                        ? iotaWalletAddress
                        : walletAddress
                    }
                    efpStats={efpStats || undefined}
                    poaps={poapTokens}
                    poapTotalCount={poapTotalCount}
                    poapHasMore={poapHasMore}
                    poapLoadingMore={poapLoadingMore}
                    onLoadMorePoaps={handleLoadMorePoaps}
                    socialIcons={socialIcons}
                    nfts={nfts}
                    nftLoading={nftLoading}
                    nftNextCursor={nftNextCursor}
                    openseaAttempted={openseaAttempted}
                    openseaHasErrors={openseaHasErrors}
                    latestCast={latestCast}
                    castLoading={castLoading}
                    firstTransactionDate={firstTransactionDate}
                    searchedIdentity={displayQuery}
                    onFollowingClick={handleFollowingClick}
                    onFollowersClick={handleFollowersClick}
                    onLoadMoreNfts={handleLoadMoreNfts}
                    onEnsureOpenSeaNfts={() => {
                      const isIota = isIotaName(displayQuery);

                      // For IOTA profiles, use linkedEvmAddress if available
                      if (isIota && linkedEvmAddress && !openseaAttempted && !nftLoading) {
                        console.log('🔄 On-demand: Fetching OpenSea NFTs for linked EVM:', linkedEvmAddress);
                        fetchNfts(linkedEvmAddress);
                        return;
                      }

                      const isEvmAddr =
                        typeof web3BioProfile?.address === 'string' &&
                        /^0x[a-fA-F0-9]{40}$/.test(web3BioProfile.address);

                      if (!isIota && isEvmAddr && !openseaAttempted && !nftLoading) {
                        console.log('🔄 On-demand: Fetching OpenSea NFTs for:', web3BioProfile.address);
                        fetchNfts(web3BioProfile.address);
                      }
                    }}
                    linkedEvmAddress={linkedEvmAddress}
                    isResolvingLinkedEvm={isResolvingLinkedEvm}
                    linkedTonAddress={linkedTonAddress}
                    iotaOnchainProfile={iotaOnchainProfile}
                    iotaNameObjectId={iotaNameObjectId}
                    iotaOwnerAddress={iotaOwnerAddress}
                    onEditIotaProfile={() => setShowIotaEditModal(true)}
                  />
                </div>
              </div>
            ) : null}

            {/* IOTA Profile Edit Modal */}
            {showIotaEditModal && isIotaName(displayQuery) && (
              <IotaProfileEditModal
                open={showIotaEditModal}
                onClose={() => setShowIotaEditModal(false)}
                iotaName={displayQuery}
                nameObjectId={iotaNameObjectId || ''}
                currentProfile={iotaOnchainProfile}
                onProfileUpdated={() => {
                  const normalizedName = normalizeIotaQuery(displayQuery);
                  if (!normalizedName) return;

                  fetchIotaOnchainProfile(normalizedName)
                    .then(response => {
                      if (response?.success) {
                        setIotaOnchainProfile(response.profile);
                        setIotaNameObjectId(response.nameObjectId);
                        setIotaOwnerAddress(response.ownerAddress);
                      }
                    })
                    .catch(console.error);
                }}
              />
            )}

            {/* Profile Dock - separate from profile container for proper z-index stacking */}
            {web3BioProfile && !showMyIDs && (
              <Dock
                items={[
                  // Only show Home button when viewing a profile (not on home page)
                  ...(web3BioProfile ? [{
                    icon: <Home className="w-6 h-6 text-[#D4AF37]" />,
                    label: 'Home',
                    onClick: (e: React.MouseEvent) => {
                      e.stopPropagation();
                      setShowSearchBar(false);
                      setHadPreviousProfile(false); // Prevent useEffect from re-enabling search
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
                      setPoapTotalCount(0);
                      setPoapHasMore(false);
                      setPoapOffset(0);
                      setActiveDockSection('profile');
                      setIsHomepage(true);
                      // Reset detail view state to fix glitch
                      setShowDetailView(false);
                      setDetailViewResult(null);
                      navigate('/', { replace: false });
                    },
                    isActive: false,
                  }] : []),
                  {
                    icon: <User className="w-6 h-6 text-[#D4AF37]" />,
                    label: t('profile'),
                    onClick: async () => {
                      if (!walletAddress) {
                        toast.error('Please connect your wallet first');
                        return;
                      }

                      // Load the connected user's own profile.
                      // For IOTA wallets, a raw address lookup often returns no results — prefer the resolved .iota name.
                      let searchIdentifier = connectedUsername || walletAddress;
                      if (!connectedUsername && connectedWalletType === 'iota') {
                        try {
                          const data = await callEdge<any>('resolve-iota-address', { address: walletAddress });
                          const maybeName = typeof data?.name === 'string' ? data.name : null;
                          if (maybeName) searchIdentifier = maybeName;
                        } catch (e) {
                          console.warn('Failed to resolve .iota name on-demand; falling back to address', e);
                        }
                      }

                      if (searchIdentifier) handleSearch(searchIdentifier);
                    },
                    isActive: activeDockSection === 'profile',
                  },
                  // Only show Edit pencil when viewing own profile
                  // For .iota profiles, also compare against iotaOwnerAddress since web3BioProfile.address may differ
                  ...((walletAddress && web3BioProfile?.address && 
                     walletAddress.toLowerCase() === web3BioProfile.address.toLowerCase()) ||
                     (walletAddress && iotaOwnerAddress && isIotaName(displayQuery) &&
                     walletAddress.toLowerCase() === iotaOwnerAddress.toLowerCase()) ? [{
                    icon: <Pencil className="w-5 h-5 text-[#D4AF37]" />,
                    label: 'Edit',
                    onClick: () => {
                      if (isIotaName(displayQuery)) {
                        // For .iota profiles, open edit onchain profile modal directly
                        setShowIotaEditModal(true);
                      } else {
                        setShowMyIDs(true);
                        setActiveDockSection('profile');
                      }
                    },
                    isActive: false,
                  }] : []),
                  // Messages icon — only for users connected with a .iota subdomain
                  ...(connectedUsername && isIotaName(connectedUsername) ? [{
                    icon: <MessageSquare className="w-6 h-6 text-[#D4AF37]" />,
                    label: 'Messages',
                    onClick: () => {
                      navigate('/messages');
                    },
                    isActive: false,
                  }] : []),
                  // Passkey icon — show when no wallet is connected
                  ...(!walletAddress ? [{
                    icon: <Fingerprint className="w-6 h-6 text-[#D4AF37]" />,
                    label: 'Passkey',
                    onClick: () => setShowPasskeyModal(true),
                    isActive: showPasskeyModal,
                  }] : []),
                  // Search icon on far right
                  {
                    icon: <Search className="w-6 h-6 text-[#D4AF37]" />,
                    label: 'Search',
                    onClick: () => {
                      // Toggle modal search overlay
                      setShowSearchBar(prev => !prev);
                    },
                    isActive: showSearchBar,
                  },
                ]}
              />
            )}

            {/* Loading Indicator */}
            {isLoadingEFP && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                <div className="bg-gray-900/90 border-2 border-[#D4AF37] rounded-lg p-6 flex flex-col items-center gap-3">
                  <Hourglass className="w-12 h-12 text-[#D4AF37] animate-pulse" />
                  <p className="text-white font-medium">{t('loading')}</p>
                </div>
              </div>
            )}

            {/* Followers List Modal */}
            {showFollowersList && (
              <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 light:bg-white/70 light:backdrop-blur-md border-2 border-[#D4AF37]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] w-full max-w-sm max-h-[60vh] overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between p-4 border-b border-[#D4AF37]/30">
                    <h3 className="text-lg font-bold text-white dark:text-white light:text-black">{t('followers')} ({totalFollowers})</h3>
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
                        placeholder={t('search_followers')}
                        value={followersSearchQuery}
                        onChange={(e) => setFollowersSearchQuery(e.target.value)}
                        className="bg-gray-800/50 dark:bg-gray-800/50 light:bg-white/50 border-[#D4AF37]/30 text-white dark:text-white light:text-black placeholder:text-gray-500 dark:placeholder:text-gray-500 light:placeholder:text-gray-600 pr-10"
                      />
                      {followersSearchQuery && (
                        <button
                          onClick={() => setFollowersSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="overflow-y-auto p-4 space-y-2 flex-1">
                    {followersList
                      .filter((user) => {
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
                          className="flex items-center justify-between p-3 bg-gray-800/50 dark:bg-gray-800/50 light:bg-white/40 hover:bg-gray-700/50 dark:hover:bg-gray-700/50 light:hover:bg-white/60 rounded-lg transition-colors"
                        >
                          <div className="flex flex-col">
                            {(user.web3bio?.displayName || user.ens?.name) && (
                              <span className="text-white dark:text-white light:text-black font-medium">
                                {user.web3bio?.displayName || user.ens?.name}
                              </span>
                            )}
                            <span className="text-gray-400 dark:text-gray-400 light:text-gray-700 text-sm font-mono">
                              {user.address.slice(0, 6)}...{user.address.slice(-4)}
                            </span>
                          </div>
                          <a
                            href={`https://vanity.box/${user.ens?.name || user.address}`}
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
                              `https://api.ethfollow.xyz/api/v1/users/${web3BioProfile.address}/followers?limit=5&offset=${nextPage * 5}`,
                            );
                            if (response.ok) {
                              const data = await response.json();
                              const newFollowers = data.followers || [];
                              setFollowersList([...followersList, ...newFollowers]);
                              setFollowersPage(nextPage);
                            }
                          } catch (error) {
                            console.error("Error loading more followers:", error);
                          }
                          setIsLoadingMore(false);
                        }}
                        className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold"
                        disabled={isLoadingMore}
                      >
                        {isLoadingMore ? t('loading') : t('load_more')}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Following List Modal */}
            {showFollowingList && (
              <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 light:bg-white/70 light:backdrop-blur-md border-2 border-[#D4AF37]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] w-full max-w-sm max-h-[60vh] overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between p-4 border-b border-[#D4AF37]/30">
                    <h3 className="text-lg font-bold text-white dark:text-white light:text-black">{t('following')} ({totalFollowing})</h3>
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
                        placeholder={t('search_following')}
                        value={followingSearchQuery}
                        onChange={(e) => setFollowingSearchQuery(e.target.value)}
                        className="bg-gray-800/50 dark:bg-gray-800/50 light:bg-white/50 border-[#D4AF37]/30 text-white dark:text-white light:text-black placeholder:text-gray-500 dark:placeholder:text-gray-500 light:placeholder:text-gray-600 pr-10"
                      />
                      {followingSearchQuery && (
                        <button
                          onClick={() => setFollowingSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="overflow-y-auto p-4 space-y-2 flex-1">
                    {followingList
                      .filter((user) => {
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
                          className="flex items-center justify-between p-3 bg-gray-800/50 dark:bg-gray-800/50 light:bg-white/40 hover:bg-gray-700/50 dark:hover:bg-gray-700/50 light:hover:bg-white/60 rounded-lg transition-colors"
                        >
                          <div className="flex flex-col">
                            {(user.web3bio?.displayName || user.ens?.name) && (
                              <span className="text-white dark:text-white light:text-black font-medium">
                                {user.web3bio?.displayName || user.ens?.name}
                              </span>
                            )}
                            <span className="text-gray-400 dark:text-gray-400 light:text-gray-700 text-sm font-mono">
                              {user.address.slice(0, 6)}...{user.address.slice(-4)}
                            </span>
                          </div>
                          <a
                            href={`https://vanity.box/${user.ens?.name || user.address}`}
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
                              `https://api.ethfollow.xyz/api/v1/users/${web3BioProfile.address}/following?limit=5&offset=${nextPage * 5}`,
                            );
                            if (response.ok) {
                              const data = await response.json();
                              const newFollowing = data.following || [];
                              setFollowingList([...followingList, ...newFollowing]);
                              setFollowingPage(nextPage);
                            }
                          } catch (error) {
                            console.error("Error loading more following:", error);
                          }
                          setIsLoadingMore(false);
                        }}
                        className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold"
                        disabled={isLoadingMore}
                      >
                        {isLoadingMore ? t('loading') : t('load_more')}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* My ID's Section */}
            {walletAddress && showMyIDs && (
              <div className="fixed left-0 right-0 flex flex-col z-[9997] top-[80px] bottom-[140px] px-0 pt-0">
                <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ minHeight: 0 }}>
                  <UserDomainsDisplay walletAddress={walletAddress} />
                </div>
              </div>
            )}

            {/* My ID's Dock - Outside container with proper z-index */}
            {walletAddress && showMyIDs && (
              <div className="fixed bottom-0 left-0 right-0 z-[10000] flex items-center justify-center pb-4 pt-4 pointer-events-none">
                <div className="pointer-events-auto">
                  <Dock
                    items={[
                      {
                        icon: <Home className="w-6 h-6 text-[#D4AF37]" />,
                        label: 'Home',
                      onClick: () => {
                          // Clear all data when returning home from My IDs
                          setShowMyIDs(false);
                          setWeb3BioProfile(null);
                          setEfpStats(null);
                          setEnsRecords(null);
                          setIsSearchActive(false);
                          setHasSearched(false);
                          setSearchQuery('');
                          setDisplayQuery('');
                          setEnsResults([]); // Clear subdomain results
                          setNfts([]);
                          setPoapTokens([]);
                          setActiveDockSection('profile');
                          setShowSearchBar(false);
                          setIsHomepage(true);
                          navigate('/', { replace: false });
                        },
                        isActive: false,
                      },
                      {
                        icon: <User className="w-6 h-6 text-[#D4AF37]" />,
                        label: 'Profile',
                        onClick: () => {
                          if (!walletAddress) {
                            toast.error('Please connect your wallet first');
                            return;
                          }
                          // Load user's profile and exit My IDs
                          setShowMyIDs(false);
                          handleSearch(walletAddress);
                        },
                        isActive: true,
                      },
                      {
                        icon: <Search className="w-6 h-6 text-[#D4AF37]" />,
                        label: 'Search',
                        onClick: () => {
                          if (!walletAddress) {
                            toast.error('Please connect your wallet first');
                            return;
                          }
                          // Exit My IDs to show search on main page
                          setShowMyIDs(false);
                          setIsSearchActive(false);
                          setShowSearchBar(prev => !prev);
                        },
                        isActive: showSearchBar,
                      },
                    ]}
                  />
                </div>
              </div>
            )}

            {/* Home Screen Dock - Show when no profile and not My ID's (including when results are shown) */}
            {!web3BioProfile && !showMyIDs && (
              <div className="fixed bottom-4 left-0 right-0 z-[10001] flex items-center justify-center">
                <Dock
                  items={[
                    // Only show Home button when NOT on homepage
                    ...(!isHomepage ? [{
                      icon: <Home className="w-6 h-6 text-[#D4AF37]" />,
                      label: 'Home',
                      onClick: () => {
                        // Clear search results and return to homepage
                        setShowSearchBar(false);
                        setIsSearchActive(false);
                        setEnsResults([]);
                        setHasSearched(false);
                        setDisplayQuery('');
                        setSearchQuery('');
                        setIsHomepage(true);
                        // Reset detail view state to fix glitch
                        setShowDetailView(false);
                        setDetailViewResult(null);
                        navigate('/', { replace: false });
                      },
                      isActive: false,
                    }] : []),
                    {
                      icon: <User className="w-6 h-6 text-[#D4AF37]" />,
                      label: 'Profile',
                      onClick: async () => {
                        if (!walletAddress) {
                          toast.error('Please connect your wallet first');
                          return;
                        }
                        // For IOTA wallets, resolve .iota name first (same as profile dock)
                        let searchIdentifier = connectedUsername || walletAddress;
                        if (!connectedUsername && connectedWalletType === 'iota') {
                          try {
                            const data = await callEdge<any>('resolve-iota-address', { address: walletAddress });
                            const maybeName = typeof data?.name === 'string' ? data.name : null;
                            if (maybeName) searchIdentifier = maybeName;
                          } catch (e) {
                            console.warn('Failed to resolve .iota name on-demand; falling back to address', e);
                          }
                        }
                        if (searchIdentifier) handleSearch(searchIdentifier);
                      },
                      isActive: false,
                    },
                    {
                      icon: <Search className="w-6 h-6 text-[#D4AF37]" />,
                      label: 'Search',
                      onClick: () => {
                        // Reset isSearchActive to show the modal-style search overlay
                        setIsSearchActive(false);
                        setShowSearchBar(prev => !prev);
                      },
                      isActive: showSearchBar,
                    },
                    {
                      icon: <Fingerprint className="w-6 h-6 text-[#D4AF37]" />,
                      label: 'Passkey',
                      onClick: () => setShowPasskeyModal(true),
                      isActive: showPasskeyModal,
                    },
                  ]}
                />
              </div>
            )}

            {/* Passkey Wallet Modal */}
            <PasskeyWalletModal
              open={showPasskeyModal}
              onClose={() => setShowPasskeyModal(false)}
              walletAddress={iotaWalletAddress || walletAddress}
              onSignPersonalMessage={iotaSignPersonalMessage}
            />

            {/* Results container - Row-based layout with 60fps optimization */}
            {showInitialResults && hasSearched && ensResults.length > 0 && !web3BioProfile && !showMyIDs && !showSearchBar && (
              <div 
                className="fixed left-0 right-0 bg-transparent z-[9997] animate-fade-in flex flex-col" 
                style={{ 
                  backfaceVisibility: 'hidden', 
                  top: 'calc(env(safe-area-inset-top, 0px) + 64px)', 
                  bottom: '0' 
                }}
              >
                <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-6 md:pt-10 pb-40">
                  <div className="max-w-4xl mx-auto space-y-6">
                    {/* No-TLD searches now redirect to Unstoppable Domains */}
                  </div>
                </div>
              </div>
            )}

            {/* No Results State */}
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
