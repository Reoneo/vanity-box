import React, { useState, useEffect } from "react";
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
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';
import { useParams } from "react-router-dom";
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
import { MessageCircle, Repeat2, Heart } from "lucide-react";

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
import { User, Link2, Image, FileImage, MessageSquare } from "lucide-react";
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
import worldAppIcon from "@/assets/world-app-icon.png";
import { DynamicMetaTags } from "@/components/DynamicMetaTags";
import searchLogo from "@/assets/search-logo.png";

import noResultsGif from "@/assets/no-results.gif";
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
  const [searchQuery, setSearchQuery] = useState("");

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
  const [poapCount, setPoapCount] = useState<number>(0);
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
  const [showSearchBar, setShowSearchBar] = useState(true);
  
  // Dock panel states
  const [activeDockSection, setActiveDockSection] = useState<'profile' | 'socials' | 'nfts' | 'farcaster'>('profile');
  const [poapTokens, setPoapTokens] = useState<any[]>([]);
  const [selectedPoap, setSelectedPoap] = useState<any>(null);
  const [showEFPFollowingModal, setShowEFPFollowingModal] = useState(false);
  const [efpFollowingUsers, setEfpFollowingUsers] = useState<EFPUser[]>([]);
  const [nfts, setNfts] = useState<any[]>([]);
  const [nftLoading, setNftLoading] = useState(false);
  const [nftNextCursor, setNftNextCursor] = useState<string | null>(null);
  const [latestCast, setLatestCast] = useState<FarcasterCast | null>(null);
  const [castLoading, setCastLoading] = useState(false);
  const [firstTransactionDate, setFirstTransactionDate] = useState<string | null>(null);

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
      window.dispatchEvent(new CustomEvent("show-my-ids"));
    };

    const handleShowSearch = () => {
      setShowMyIDs(false);
      setWeb3BioProfile(null);
      setHasSearched(false);
    };

    window.addEventListener("wallet-connected", handleWalletChange as EventListener);
    window.addEventListener("wallet-disconnected", () => {
      setWalletAddress(undefined);
      setShowMyIDs(false);
    });
    window.addEventListener("show-my-ids", handleShowMyIDs);
    window.addEventListener("show-search", handleShowSearch);
    
    const handleToggleSearchBar = (event: CustomEvent) => {
      setShowSearchBar(event.detail.show);
    };
    
    // Listen for direct profile load from wallet menu
    const handleDirectProfileLoad = (event: CustomEvent) => {
      const { identifier, skipSearch } = event.detail;
      if (skipSearch && identifier) {
        // Directly load profile without showing search UI
        console.log('🔍 Direct profile load requested for:', identifier);
        handleSearch(identifier);
      }
    };
    
    window.addEventListener("toggle-search-bar", handleToggleSearchBar as EventListener);
    window.addEventListener("load-direct-profile", handleDirectProfileLoad as EventListener);

    return () => {
      window.removeEventListener("wallet-connected", handleWalletChange as EventListener);
      window.removeEventListener("wallet-disconnected", () => {
        setWalletAddress(undefined);
        setShowMyIDs(false);
      });
      window.removeEventListener("show-my-ids", handleShowMyIDs);
      window.removeEventListener("show-search", handleShowSearch);
      window.removeEventListener("toggle-search-bar", handleToggleSearchBar as EventListener);
      window.removeEventListener("load-direct-profile", handleDirectProfileLoad as EventListener);
    };
  }, []);

  // Reset to profile section when new profile loads
  useEffect(() => {
    if (web3BioProfile) {
      setActiveDockSection('profile');
      // Clear previous profile's NFT data
      setNfts([]);
      setNftNextCursor(null);
      setLatestCast(null);
      setPoapTokens([]);
    }
  }, [web3BioProfile]);

  // Preload EFP lists in background when profile loads
  useEffect(() => {
    if (web3BioProfile?.address && efpStats) {
      // Preload following list if count > 0
      if (efpStats.following_count > 0 && followingList.length === 0) {
        console.log('🔄 Background: Preloading EFP following list...');
        fetch(`https://api.ethfollow.xyz/api/v1/users/${web3BioProfile.address}/following?limit=10&offset=0`)
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
        fetch(`https://api.ethfollow.xyz/api/v1/users/${web3BioProfile.address}/followers?limit=10&offset=0`)
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
  }, [web3BioProfile?.address, efpStats]);

  // Preload NFTs in background when profile loads
  useEffect(() => {
    const address = web3BioProfile?.address;
    const isValidAddress = address && 
                          address !== 'undefined' && 
                          typeof address === 'string' && 
                          address.trim() !== '' &&
                          !(typeof address === 'object' && (address as any)?._type === 'undefined');
    
    if (isValidAddress && nfts.length === 0 && !nftLoading) {
      console.log('🔄 Background: Preloading OpenSea NFTs for address:', address);
      // Small delay to let initial profile load complete
      const timer = setTimeout(() => {
        fetchNfts();
      }, 1000);
      return () => clearTimeout(timer);
    } else if (address && !isValidAddress) {
      console.warn('🔄 Background: Skipping NFT preload - invalid address:', address);
    }
  }, [web3BioProfile?.address]);

  // Preload POAPs in background when profile loads  
  useEffect(() => {
    if (web3BioProfile?.address && poapTokens.length === 0 && !isLoadingPoaps) {
      console.log('🔄 Background: Ensuring POAPs are loaded...');
      const loadPoaps = async () => {
        try {
          setIsLoadingPoaps(true);
          const { data: poapData, error: poapError } = await supabase.functions.invoke("get-poap-data", {
            body: { walletAddress: web3BioProfile.address },
          });

          if (!poapError && poapData?.success) {
            setPoapCount(poapData.count || 0);
            
            const { data: tokensData } = await supabase
              .from('poap_tokens')
              .select('*')
              .eq('wallet_address', web3BioProfile.address.toLowerCase());
            
            if (tokensData) {
              setPoapTokens(tokensData.map((token: any) => ({
                eventId: token.event_id,
                eventName: token.event_name,
                eventDescription: token.event_description,
                eventImageUrl: token.event_image_url,
                eventStartDate: token.event_start_date,
                eventEndDate: token.event_end_date,
                eventYear: token.event_year,
                tokenId: token.token_id,
                owner: token.owner,
                chain: token.chain,
              })));
              console.log(`✅ Background: Loaded ${tokensData.length} POAPs`);
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
  }, [web3BioProfile?.address]);

  // Hide search bar when profile is loaded, show when cleared
  useEffect(() => {
    if (web3BioProfile) {
      setShowSearchBar(false);
      window.dispatchEvent(new Event('profile-loaded'));
    } else {
      setShowSearchBar(true);
      window.dispatchEvent(new Event('profile-cleared'));
    }
  }, [web3BioProfile]);


  const protocols = ["DNS", "ENS"];
  const clubs = ["Crypto", "DeFi", "Dev", "Digits", "Letters", "Surname", "Startup", "Artist", "Misc", "Gaming", "Personal"];

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

  // Show all subdomains initially when component mounts
  useEffect(() => {
    if (!hasSearched && !username) {
      const allResults = getAllResults();
      setEnsResults(allResults);
      setHasSearched(true);
      setDisplayQuery("");
    }
  }, []);

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

    // Prevent searches with spaces
    if (trimmedQuery.includes(" ")) {
      return;
    }

    // Max character limit varies by query type:
    // - Wallet addresses: 42 chars (0x + 40 hex)
    // - ENS/DNS domains: 63 chars (max ENS label length)
    // - Subdomains with multiple dots: 50 chars
    // - Regular names: 12 chars
    const hasMultipleDots = trimmedQuery.split('.').filter(Boolean).length > 2;
    const isPotentialWallet = trimmedQuery.startsWith('0x') && /^0x[a-fA-F0-9]+$/i.test(trimmedQuery);
    const isEnsDomain = /\.(eth|box|xyz|io|com|org|net|id|world|apt|ton|hl|chain)$/i.test(trimmedQuery);

    let maxLength = 12; // Default for regular names
    if (isPotentialWallet) {
      maxLength = 50; // Allow wallet addresses (42 chars + buffer)
    } else if (hasMultipleDots || isEnsDomain) {
      maxLength = 63; // Max ENS label length per segment
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

    // Update the display query to match what's being searched
    setDisplayQuery(trimmedQuery);

    setIsLoading(true);
    setHasSearched(true);
    setIsSearchActive(true);

    // Check if query is a valid Ethereum wallet address (0x + 40 hex chars = 42 total)
    const isWalletAddress = trimmedQuery && /^0x[a-fA-F0-9]{40}$/i.test(trimmedQuery);

    console.log("🔍 Query analysis:", {
      query: trimmedQuery,
      isWalletAddress,
      hasDot: trimmedQuery?.includes("."),
      length: trimmedQuery?.length
    });

    // Normalize wallet address to checksummed format if it's a wallet address
    let normalizedAddress = trimmedQuery;
    if (isWalletAddress) {
      try {
        // Try to get checksummed version, but don't fail if it doesn't validate
        normalizedAddress = getAddress(trimmedQuery.toLowerCase());
        console.log("✅ Checksummed address:", normalizedAddress);
      } catch (err) {
        // If getAddress fails, use the original - Web3.bio can handle it
        console.log("⚠️ Using original address format:", trimmedQuery);
        normalizedAddress = trimmedQuery;
      }
    }

    // If query contains a dot OR is a wallet address, try fetching profile
    if (trimmedQuery && (trimmedQuery.includes(".") || isWalletAddress)) {
      // Normalize for matching (users may type with caps)
      const normalizedQuery = trimmedQuery.toLowerCase();

      // Detect if this is a Namestone domain or subdomain
      // Check for Namestone TLDs (.world, .cash, etc.) OR subdomains (2+ dots)
      const namesoneTLDs = ['.world', '.cash', '.apt', '.ton', '.flirtad', '.mexipay', '.guavapay', '.termux', '.spyda', '.mith', '.30315', '.teamxrp'];
      const isNamestoneTLD = namesoneTLDs.some(tld => normalizedQuery.endsWith(tld));
      const dotCount = normalizedQuery.split('.').filter(Boolean).length - 1;
      const isNamestoneSubdomain = dotCount >= 2;
      const isNamestoneDomain = isNamestoneTLD || isNamestoneSubdomain;
      
      console.log(`🔍 Query: ${normalizedQuery}, Dots: ${dotCount}, Namestone TLD: ${isNamestoneTLD}, Is Namestone: ${isNamestoneDomain}`);

      // Use different fetch strategies based on name type
      if (isNamestoneDomain) {
        // Direct Namestone lookup for Namestone TLDs and subdomains
        console.log('🔗 Fetching Namestone domain profile for:', normalizedQuery);
        try {
          const { data, error } = await supabase.functions.invoke('get-ens-subdomain-profile', {
            body: { subdomain: normalizedQuery }
          });

          if (error) {
            console.error('❌ Error fetching Namestone domain profile:', error);
            setIsLoading(false);
          } else if (data && !data.error) {
            console.log('✅ Namestone domain profile found:', data);
            setWeb3BioProfile(data);
            setEnsResults([]);
            
            if (data.ensRecords) {
              setEnsRecords(data.ensRecords);
            }
            
            setIsLoading(false);
          } else {
            // No valid profile found
            setIsLoading(false);
          }
        } catch (error) {
          console.log('❌ Failed to fetch Namestone domain profile:', error);
          setIsLoading(false);
        }
      } else {
        // EXISTING PATH: Web3.bio lookup for regular names and wallet addresses
        console.log('🔍 Fetching web3.bio profile for:', isWalletAddress ? normalizedAddress : trimmedQuery);
        try {
          // Set a 15-second safety timeout to force clear loading state
          const loadingTimeout = setTimeout(() => {
            console.warn('⚠️ Loading timeout reached after 15 seconds, forcing clear');
            setIsLoading(false);
            toast.error("Request timed out. Please try again.");
          }, 15000);
          
          // Use edge function to call web3.bio API with proper authentication
          const { data, error } = await supabase.functions.invoke('get-web3bio-profile', {
            body: { handle: isWalletAddress ? normalizedAddress : trimmedQuery }
          });
          
          // Clear the timeout since request completed
          clearTimeout(loadingTimeout);

          console.log('📥 Web3.bio response:', { data, error });

          if (error) {
            console.error('❌ Error fetching web3.bio profile:', error);
            toast.error("Profile lookup failed. Please try again.");
            setIsLoading(false);
            return;
          } else if (data && Array.isArray(data) && data.length > 0) {
            // Only process if we got valid data (has results)
            let profileData = data[0];
            
            // If response is an array, look for Farcaster profile and merge it
            if (data.length > 1) {
              const farcasterProfile = data.find((p: any) => p.platform === 'farcaster');
              if (farcasterProfile) {
                console.log('✅ Found Farcaster profile in web3.bio response:', farcasterProfile);
                if (!profileData.links) profileData.links = {};
                profileData.links.farcaster = {
                  link: `https://warpcast.com/${farcasterProfile.identity}`,
                  handle: farcasterProfile.identity,
                  fid: farcasterProfile.social?.uid
                };
              }
            }
            
            console.log('✅ Web3.bio profile data:', profileData);
            
            // IMMEDIATE DISPLAY: Show profile right away with basic data
            setWeb3BioProfile(profileData);
            setEnsResults([]);

            // CRITICAL: Fetch EFP stats, first transaction, AND ENS social links together
            const addressOrName = profileData.address || trimmedQuery;
            Promise.all([
              // Fetch EFP stats
              (async () => {
                if (!addressOrName) return null;
                try {
                  console.log('⚡ Fetching EFP stats...');
                  const efpResponse = await fetch(`https://api.ethfollow.xyz/api/v1/users/${addressOrName}/stats`);
                  if (efpResponse.ok) {
                    const efpData = await efpResponse.json();
                    console.log('✅ EFP stats loaded');
                    const stats = {
                      followers_count: parseInt(efpData.followers_count) || 0,
                      following_count: parseInt(efpData.following_count) || 0,
                    };
                    setEfpStats(stats);
                    return stats;
                  }
                  return null;
                } catch (e) {
                  console.warn('⚠️ EFP stats failed:', e);
                  return null;
                }
              })(),
              
              // Fetch first transaction
              (async () => {
                if (!profileData.address) return null;
                try {
                  console.log('⚡ Fetching first transaction...');
                  const { data: txData, error: txError } = await supabase.functions.invoke("get-first-transaction", {
                    body: { address: profileData.address },
                  });
                  if (!txError && txData?.date) {
                    console.log('✅ First transaction loaded');
                    setFirstTransactionDate(txData.date);
                    return txData.date;
                  }
                  return null;
                } catch (e) {
                  console.warn('⚠️ First transaction failed:', e);
                  return null;
                }
              })(),
              
              // Fetch ENS text records for social links (MOVED HERE from Stage 2)
              (async () => {
                try {
                  const publicClient = createPublicClient({
                    chain: mainnet,
                    transport: http(),
                  });

                  let ensNameToQuery: string | null = null;
                  if (normalizedQuery.endsWith('.eth')) {
                    ensNameToQuery = normalize(trimmedQuery);
                  } else if (profileData.address) {
                    try {
                      const primary = await publicClient.getEnsName({ address: profileData.address as `0x${string}` });
                      if (primary) ensNameToQuery = normalize(primary);
                    } catch (_) {}
                  }

                  if (ensNameToQuery) {
                    console.log('⚡ Fetching ENS text records for socials...');
                    const textRecordKeys = [
                      'display', 'description', 'email', 'keywords', 'location', 'name', 'notice', 'phone', 'url', 'avatar', 'header',
                      'com.twitter', 'com.github', 'com.discord', 'com.reddit', 'com.youtube', 'com.facebook', 'com.spotify', 'com.linkedin', 'com.instagram', 'com.farcaster',
                      'org.telegram', 'vnd.twitter', 'vnd.github'
                    ];

                    const recordResults = await Promise.all(
                      textRecordKeys.map(async (key) => {
                        try {
                          const value = await publicClient.getEnsText({ name: ensNameToQuery!, key });
                          return { key, value };
                        } catch {
                          return { key, value: null };
                        }
                      })
                    );

                    const ensTextRecords: Record<string, string> = {};
                    recordResults.forEach(({ key, value }) => {
                      if (value) ensTextRecords[key] = value;
                    });
                    console.log('✅ ENS text records loaded for socials');

                    // Map ENS records into state
                    const records = {
                      avatar: ensTextRecords.avatar || '',
                      email: ensTextRecords.email || '',
                      url: ensTextRecords.url || '',
                      description: ensTextRecords.description || '',
                      notice: ensTextRecords.notice || '',
                      keywords: ensTextRecords.keywords || '',
                      'com.discord': ensTextRecords['com.discord'] || '',
                      'com.github': ensTextRecords['com.github'] || '',
                      'com.twitter': ensTextRecords['com.twitter'] || '',
                      'org.telegram': ensTextRecords['org.telegram'] || '',
                      'com.farcaster': ensTextRecords['com.farcaster'] || '',
                    };

                    setEnsRecords({
                      name: trimmedQuery,
                      address: profileData?.address,
                      avatar: records.avatar || profileData?.avatar,
                      records,
                    });

                    // Update profile with ENS social links
                    const updatedProfile = { ...profileData };
                    if (!updatedProfile.links) updatedProfile.links = {};
                    
                    if (ensTextRecords['com.twitter'] || ensTextRecords['vnd.twitter']) {
                      const twitterHandle = ensTextRecords['com.twitter'] || ensTextRecords['vnd.twitter'];
                      updatedProfile.links.twitter = {
                        link: `https://twitter.com/${twitterHandle}`,
                        handle: twitterHandle
                      };
                    }
                    if (ensTextRecords['com.github'] || ensTextRecords['vnd.github']) {
                      const githubHandle = ensTextRecords['com.github'] || ensTextRecords['vnd.github'];
                      updatedProfile.links.github = {
                        link: `https://github.com/${githubHandle}`,
                        handle: githubHandle
                      };
                    }
                    if (ensTextRecords['com.discord']) {
                      updatedProfile.links.discord = {
                        link: `https://discord.com/users/${ensTextRecords['com.discord']}`,
                        handle: ensTextRecords['com.discord']
                      };
                    }
                    if (ensTextRecords['org.telegram']) {
                      updatedProfile.links.telegram = {
                        handle: ensTextRecords['org.telegram']
                      };
                    }
                    if (ensTextRecords['com.reddit']) {
                      updatedProfile.links.reddit = {
                        link: `https://reddit.com/u/${ensTextRecords['com.reddit']}`,
                        handle: ensTextRecords['com.reddit']
                      };
                    }
                    if (ensTextRecords['com.youtube']) {
                      updatedProfile.links.youtube = {
                        link: ensTextRecords['com.youtube'].startsWith('http') 
                          ? ensTextRecords['com.youtube']
                          : `https://youtube.com/${ensTextRecords['com.youtube']}`,
                        handle: ensTextRecords['com.youtube']
                      };
                    }
                    if (ensTextRecords['com.facebook']) {
                      updatedProfile.links.facebook = {
                        link: ensTextRecords['com.facebook'].startsWith('http')
                          ? ensTextRecords['com.facebook']
                          : `https://facebook.com/${ensTextRecords['com.facebook']}`,
                        handle: ensTextRecords['com.facebook']
                      };
                    }
                    if (ensTextRecords['com.spotify']) {
                      updatedProfile.links.spotify = {
                        link: ensTextRecords['com.spotify'],
                        handle: ensTextRecords['com.spotify']
                      };
                    }
                    if (ensTextRecords['com.linkedin']) {
                      updatedProfile.links.linkedin = {
                        link: ensTextRecords['com.linkedin'].startsWith('http')
                          ? ensTextRecords['com.linkedin']
                          : `https://linkedin.com/in/${ensTextRecords['com.linkedin']}`,
                        handle: ensTextRecords['com.linkedin']
                      };
                    }
                    if (ensTextRecords['com.instagram']) {
                      updatedProfile.links.instagram = {
                        link: ensTextRecords['com.instagram'].startsWith('http')
                          ? ensTextRecords['com.instagram']
                          : `https://instagram.com/${ensTextRecords['com.instagram']}`,
                        handle: ensTextRecords['com.instagram']
                      };
                    }
                    if (ensTextRecords['com.farcaster']) {
                      updatedProfile.links.farcaster = {
                        link: `https://warpcast.com/${ensTextRecords['com.farcaster']}`,
                        handle: ensTextRecords['com.farcaster']
                      };
                    }
                    
                    // Update header from ENS text record
                    if (ensTextRecords['header']) {
                      updatedProfile.header = ensTextRecords['header'];
                    }
                    
                    // Merge core ENS text records
                    if (ensTextRecords['url']) {
                      updatedProfile.url = ensTextRecords['url'];
                      updatedProfile.website = ensTextRecords['url'];
                    }
                    if (ensTextRecords['email']) {
                      updatedProfile.email = ensTextRecords['email'];
                    }
                    if (ensTextRecords['location']) {
                      updatedProfile.location = ensTextRecords['location'];
                    }
                    if (ensTextRecords['description'] && !updatedProfile.description) {
                      updatedProfile.description = ensTextRecords['description'];
                    }
                    
                    setWeb3BioProfile(updatedProfile);
                  }
                  return null;
                } catch (error) {
                  console.error('Error fetching ENS records:', error);
                  return null;
                }
              })(),
            ]).then(() => {
              // All critical data loaded - stop loading state
              setIsLoading(false);
              console.log('✅ All critical profile data loaded');
            });

            // STAGE 3: Fetch POAP data (low priority) - non-blocking
            if (profileData.address) {
              (async () => {
                try {
                  console.log('⚡ Stage 3: Fetching POAP data...');
                  setIsLoadingPoaps(true);
                  const { data: poapData, error: poapError } = await supabase.functions.invoke("get-poap-data", {
                    body: { walletAddress: profileData.address },
                  });

                  if (!poapError && poapData?.success) {
                    const { data: tokensData } = await supabase
                      .from('poap_tokens')
                      .select('*')
                      .eq('wallet_address', profileData.address.toLowerCase());
                    
                    console.log('✅ POAP data loaded');
                    setPoapCount(poapData.count || 0);
                    if (tokensData && tokensData.length > 0) {
                      setPoapTokens(tokensData.map((token: any) => ({
                        eventId: token.event_id,
                        eventName: token.event_name,
                        eventDescription: token.event_description,
                        eventImageUrl: token.event_image_url,
                        eventStartDate: token.event_start_date,
                        eventEndDate: token.event_end_date,
                        eventYear: token.event_year,
                        tokenId: token.token_id,
                        owner: token.owner,
                        chain: token.chain,
                      })));
                    }
                  } else {
                    setPoapCount(0);
                  }
                } catch (e) {
                  console.warn('⚠️ Stage 3: POAP data failed:', e);
                  setPoapCount(0);
                } finally {
                  setIsLoadingPoaps(false);
                }
              })();
            }
          } else {
            // No valid data returned and no error - clear loading state
            console.log('⚠️ No profile data found');
            setIsLoading(false);
          }
        } catch (error) {
          console.log("web3.bio failed:", error);
          toast.error("Profile lookup failed. Please try again.");
          setIsLoading(false);
          return;
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

    // Check which subdomains are already taken on Namestone (only if there's a query)
    let allResults = getAllResults();
    const checkFailedDomains = new Set<string>();
    
    // Show results now that user has searched
    setShowInitialResults(true);
    
    if (trimmedQuery) {
      const checkPromises = allResults.map(async (result) => {
        const domain = result.name.toLowerCase();
        
        // Skip Vanity.ton checks
        if (domain === 'vanity.ton') {
          return null;
        }
        
        try {
          const { data, error } = await supabase.functions.invoke("check-namestone-subdomain", {
            body: { subdomain: trimmedQuery, domain },
          });
          
          // If check failed (error or no success), mark as check_failed
          if (error || !data?.success) {
            console.error(`Check failed for ${domain}:`, error || data);
            return { domain, status: 'check_failed' };
          }
          
          if (data?.exists) {
            return { domain, status: 'taken' };
          }
        } catch (error) {
          console.error(`Error checking ${domain}:`, error);
          return { domain, status: 'check_failed' };
        }
        
        return null;
      });

      const checkResults = await Promise.all(checkPromises);
      const taken = new Set<string>();
      
      checkResults.forEach((result) => {
        if (result) {
          if (result.status === 'taken') {
            taken.add(result.domain);
          } else if (result.status === 'check_failed') {
            checkFailedDomains.add(result.domain);
          }
        }
      });
      
      setTakenSubdomains(taken);
      
      // Store check_failed domains in a state or pass to render
      // For now, we'll use a window variable to communicate with render
      (window as any).__checkFailedDomains = checkFailedDomains;
    } else {
      setTakenSubdomains(new Set());
      (window as any).__checkFailedDomains = new Set();
    }

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

    // Sort results: Selectable items first ("Select"), then coming soon items, then alphabetically
    filteredResults.sort((a, b) => {
      const aIsSelectable = (a as any).selectable === true || a.name === "Smith.cash" || a.name === "$mith.eth";
      const bIsSelectable = (b as any).selectable === true || b.name === "Smith.cash" || b.name === "$mith.eth";

      // If both selectable or both not, sort alphabetically
      if (aIsSelectable === bIsSelectable) {
        return a.name.localeCompare(b.name);
      }

      // Selectable items come first
      return aIsSelectable ? -1 : 1;
    });

    setEnsResults(filteredResults);
    console.log("Results set", filteredResults.length);

    if (searchQuery) {
      setIsAvailable(!searchQuery.toLowerCase().includes("taken"));
    }
    setIsLoading(false);
  };


  // Fetch functions for dock sections
  const fetchNfts = async (next?: string) => {
    const address = web3BioProfile?.address || walletAddress;
    
    // Sanitize the next parameter to handle MiniKit undefined objects
    const sanitizedNext = (next && typeof next === 'string' && next !== 'undefined') 
      ? next 
      : (next && typeof next === 'object' && (next as any)?._type === 'undefined')
        ? undefined
        : next;
    
    console.log('fetchNfts called with:', { 
      address, 
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
    
    console.log('Fetching NFTs with valid address:', addressString);
    
    try {
      setNftLoading(true);
      
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
      
      const data = await callEdge("get-opensea-nfts", requestBody);
      
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
      
      if (sanitizedNext) {
        setNfts((prev) => [...prev, ...data.nfts]);
      } else {
        setNfts(data.nfts || []);
      }
      setNftNextCursor(sanitizedResponseNext || null);
    } catch (err: any) {
      console.error("Error fetching NFTs:", err);
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
    
    // Validate we still have a valid address before loading more
    const address = web3BioProfile?.address || walletAddress;
    const addressString = typeof address === 'string' ? address : (address as any)?.value;
    
    if (!addressString || 
        addressString === 'undefined' || 
        addressString.trim() === '' ||
        (typeof address === 'object' && (address as any)?._type === 'undefined')) {
      console.warn('Cannot load more NFTs: No valid address available');
      return;
    }
    
    fetchNfts(nftNextCursor);
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

      <div className="w-full h-full">
        {/* Show mint interface when a result is selected */}
        {showMintInterface && selectedResult ? (
          <SubdomainMintModal
            isOpen={true}
            onClose={handleBackToResults}
            subdomain={displayQuery ? `${displayQuery}.${selectedResult.name}` : selectedResult.name}
            price={price}
            resultAvatar={selectedResult.imageUrl}
            domain={selectedResult.name.trim().toLowerCase()}
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
            
            {/* Loading Progress Bar */}
            <LoadingProgress isLoading={isLoading && !web3BioProfile} />
            
            {/* Search bar and header - conditional rendering based on search state */}
            {!showMyIDs && !isLoading && (
              <>
                {!isSearchActive ? (
                  <>
                    {/* Coming Soon Display - Only show when no profile and search bar is closed */}
                    {!web3BioProfile && !showSearchBar && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[#D4AF37] animate-pulse">
                          Coming Soon
                        </h1>
                      </div>
                    )}
                    
                    {showSearchBar && (
                      <>
                        {/* Dim overlay */}
                        <div 
                          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] animate-fade-in"
                          onClick={() => setShowSearchBar(false)}
                        />
                        
                        {/* Centered search modal */}
                        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
                          <div className="w-full max-w-md pointer-events-auto animate-scale-in">
                            {/* Search bar */}
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
                            <DropdownMenuContent
                              align="start"
                              className="w-72 md:w-80 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-[#D4AF37]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] p-4 z-[60]"
                            >
                              <div className="relative">
                                <div className="absolute -top-16 -right-16 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-3xl" />
                                <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-[#D4AF37]/5 rounded-full blur-3xl" />

                                <div className="relative z-10 space-y-4">
                                  <DropdownMenuLabel className="text-lg font-semibold text-white">Filter</DropdownMenuLabel>
                                  <DropdownMenuSeparator className="bg-[#D4AF37]/30" />

                                  <div className="space-y-3">
                                    <div className="flex flex-wrap gap-2">
                                      {clubs.map((club) => (
                                        <label
                                          key={club}
                                          className={cn(
                                            "px-4 py-2 rounded-full cursor-pointer transition-all duration-300 flex items-center gap-2 text-sm font-medium border-2",
                                            filters.club.includes(club)
                                              ? "bg-[#D4AF37] text-black border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.4)]"
                                              : "bg-gray-800/50 text-gray-300 border-gray-700 hover:border-[#D4AF37]/50 hover:bg-gray-700/50",
                                          )}
                                          onClick={(e) => {
                                            e.preventDefault();
                                            handleClubToggle(club);
                                          }}
                                        >
                                          {club}
                                        </label>
                                      ))}
                                    </div>
                                  </div>


                                  <DropdownMenuSeparator className="bg-[#D4AF37]/30" />
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={handleClearFilters}
                                      className="flex-1 border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10 hover:border-[#D4AF37] hover:text-[#D4AF37]"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setShowFilterDropdown(false);
                                        if (searchQuery.trim()) {
                                          handleSearch();
                                          setIsSearchActive(true);
                                          onSearchClick?.();
                                        }
                                      }}
                                      className="flex-1 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black border-[#D4AF37]"
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <Input
                          placeholder={t("Search for a name")}
                          className="h-12 text-sm text-center bg-white dark:bg-gray-900 border-[#D4AF37] focus:border-[#D4AF37] text-gray-900 dark:text-white placeholder-gray-900 dark:placeholder-white pl-20 pr-20"
                          value={searchQuery}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSearch();
                              setIsSearchActive(true);
                              onSearchClick?.();
                            }
                          }}
                          onFocus={() => {
                            setShowFilterDropdown(false);
                          }}
                        />
                        <div className="absolute right-1 top-1 z-10 flex items-center gap-1 h-10">
                          {searchQuery && (
                            <button
                              onClick={() => {
                                setSearchQuery("");
                                setEnsResults([]);
                                setIsAvailable(null);
                                // Don't clear profile - keep user on current view
                                // setWeb3BioProfile(null);
                                // setIsSearchActive(false);
                                // onClearSearch?.();
                              }}
                              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              aria-label="Clear search"
                            >
                              <X className="w-4 h-4 text-black dark:text-white" />
                            </button>
                          )}
                          <Button
                            onClick={() => {
                              handleSearch();
                              setIsSearchActive(true);
                              onSearchClick?.();
                              // Close POAP modal if open
                              window.dispatchEvent(new CustomEvent('close-poap-modal'));
                            }}
                            size="sm"
                            className="h-8 px-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black"
                            disabled={!searchQuery.trim() || isLoading}
                          >
                            <Search className="w-4 h-4 text-black" />
                          </Button>
                        </div>
                            </div>
                          </div>
                        </div>
                      </>
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
                        ) : ensResults.length > 0 ? (
                          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-2">
                            <span className="text-black dark:text-white">{ensResults.length} ID's </span>
                            <span className="text-[#D4AF37]">Found</span>
                          </h1>
                        ) : null}
                      </div>
                    )}
                    
                    {showSearchBar && (
                    <div className="w-full max-w-md mx-auto mb-2 relative z-50 transition-all duration-300 mt-2">
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
                            <DropdownMenuContent
                              align="start"
                              className="w-72 md:w-80 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-[#D4AF37]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] p-4 z-[60]"
                            >
                              <div className="relative">
                                <div className="absolute -top-16 -right-16 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-3xl" />
                                <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-[#D4AF37]/5 rounded-full blur-3xl" />

                                <div className="relative z-10 space-y-4">
                                  <DropdownMenuLabel className="text-lg font-semibold text-white">Filter</DropdownMenuLabel>
                                  <DropdownMenuSeparator className="bg-[#D4AF37]/30" />

                                  <div className="space-y-3">
                                    <div className="flex flex-wrap gap-2">
                                      {clubs.map((club) => (
                                        <label
                                          key={club}
                                          className={cn(
                                            "px-4 py-2 rounded-full cursor-pointer transition-all duration-300 flex items-center gap-2 text-sm font-medium border-2",
                                            filters.club.includes(club)
                                              ? "bg-[#D4AF37] text-black border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.4)]"
                                              : "bg-gray-800/50 text-gray-300 border-gray-700 hover:border-[#D4AF37]/50 hover:bg-gray-700/50",
                                          )}
                                          onClick={(e) => {
                                            e.preventDefault();
                                            handleClubToggle(club);
                                          }}
                                        >
                                          {club}
                                        </label>
                                      ))}
                                    </div>
                                  </div>


                                  <DropdownMenuSeparator className="bg-[#D4AF37]/30" />
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={handleClearFilters}
                                      className="flex-1 border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10 hover:border-[#D4AF37] hover:text-[#D4AF37]"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setShowFilterDropdown(false);
                                        if (searchQuery.trim()) {
                                          handleSearch();
                                          setIsSearchActive(true);
                                          onSearchClick?.();
                                        }
                                      }}
                                      className="flex-1 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black border-[#D4AF37]"
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <Input
                          placeholder={t("Search for a name")}
                          className="h-12 text-sm text-center bg-white dark:bg-gray-900 border-[#D4AF37] focus:border-[#D4AF37] text-gray-900 dark:text-white placeholder-gray-900 dark:placeholder-white pl-20 pr-20"
                          value={searchQuery}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSearch();
                              setIsSearchActive(true);
                              onSearchClick?.();
                            }
                          }}
                          onFocus={() => {
                            setShowFilterDropdown(false);
                          }}
                        />
                        <div className="absolute right-1 top-1 z-10 flex items-center gap-1 h-10">
                          {searchQuery && (
                            <button
                              onClick={() => {
                                setSearchQuery("");
                                setEnsResults([]);
                                setIsAvailable(null);
                                setShowInitialResults(false);
                                // Don't clear profile - keep user on current view
                                // setWeb3BioProfile(null);
                                // setIsSearchActive(false);
                                // onClearSearch?.();
                              }}
                              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              aria-label="Clear search"
                            >
                              <X className="w-4 h-4 text-black dark:text-white" />
                            </button>
                          )}
                          <Button
                            onClick={() => {
                              handleSearch();
                              setIsSearchActive(true);
                              onSearchClick?.();
                            }}
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
                  </>
                )}
              </>
            )}

            {/* Profile Card with Dock Navigation - dynamic positioning based on search bar */}
            {web3BioProfile && !showMyIDs ? (
              <div
                className={cn(
                  "fixed left-0 right-0 flex flex-col z-[9997]",
                  showSearchBar ? "top-[140px] bottom-[140px] px-4 pt-4" : "top-[80px] bottom-[140px] px-4 pt-4"
                )}
              >
                {/* Profile Card - scrollable content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ minHeight: 0 }}>
                  <ProfileCard
                    activeSection={activeDockSection}
                    web3BioProfile={web3BioProfile}
                    currentWalletAddress={web3BioProfile.address}
                    connectedWalletAddress={walletAddress}
                    efpStats={efpStats || undefined}
                    poaps={poapTokens}
                    socialIcons={socialIcons}
                    nfts={nfts}
                    nftLoading={nftLoading}
                    nftNextCursor={nftNextCursor}
                    latestCast={latestCast}
                    castLoading={castLoading}
                    firstTransactionDate={firstTransactionDate}
                    onFollowingClick={handleFollowingClick}
                    onFollowersClick={handleFollowersClick}
                    onLoadMoreNfts={handleLoadMoreNfts}
                  />
                </div>

                {/* Dock - fixed at bottom with matching gap */}
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center pb-4 pt-4">
                  <Dock
                    items={[
                      {
                        icon: <Home className="w-6 h-6 text-[#D4AF37]" />,
                        label: 'Home',
                        onClick: () => {
                          setWeb3BioProfile(null);
                          setIsSearchActive(false);
                          setActiveDockSection('profile');
                        },
                        isActive: false,
                      },
                      {
                        icon: <User className="w-6 h-6 text-[#D4AF37]" />,
                        label: t('profile'),
                        onClick: () => setActiveDockSection('profile'),
                        isActive: activeDockSection === 'profile',
                      },
                      {
                        icon: <Pencil className="w-5 h-5 text-[#D4AF37]" />,
                        label: 'Edit',
                        onClick: () => {
                          setShowMyIDs(true);
                          setActiveDockSection('profile');
                        },
                        isActive: false,
                      },
                      // Only show NFT icon if NFTs are found (not while loading)
                      ...(nfts && nfts.length > 0 ? [{
                        icon: <FileImage className="w-6 h-6 text-[#D4AF37]" />,
                        label: t('nfts'),
                        onClick: () => {
                          setActiveDockSection('nfts');
                          const address = web3BioProfile?.address || walletAddress;
                          
                          // Comprehensive validation before fetching
                          const isValidAddress = address && 
                                                address !== 'undefined' && 
                                                typeof address === 'string' && 
                                                address.trim() !== '' &&
                                                !(typeof address === 'object' && (address as any)?._type === 'undefined');
                          
                          console.log('NFT section clicked - validation:', { 
                            address, 
                            isValidAddress,
                            web3BioAddress: web3BioProfile?.address,
                            walletAddress,
                            nftsLength: nfts.length 
                          });
                          
                          // Only fetch NFTs if we have a valid wallet address and no NFTs loaded yet
                          if (isValidAddress && nfts.length === 0) {
                            fetchNfts();
                          } else if (!isValidAddress) {
                            console.warn('Cannot fetch NFTs: Invalid or missing wallet address');
                          }
                        },
                        isActive: activeDockSection === 'nfts',
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
                </div>
              </div>
            ) : null}

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

            {/* My ID's Section with Dock */}
            {walletAddress && showMyIDs && (
              <div className="fixed left-0 right-0 flex flex-col z-[9997] top-[80px] bottom-[140px] px-4 pt-4">
                <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ minHeight: 0 }}>
                  <UserDomainsDisplay walletAddress={walletAddress} />
                </div>

                {/* Dock for My ID's page */}
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center pb-4 pt-4">
                  <Dock
                    items={[
                      {
                        icon: <Home className="w-6 h-6 text-[#D4AF37]" />,
                        label: 'Home',
                        onClick: () => {
                          setShowMyIDs(false);
                          setWeb3BioProfile(null);
                          setIsSearchActive(false);
                          setActiveDockSection('profile');
                        },
                        isActive: false,
                      },
                      {
                        icon: <User className="w-6 h-6 text-[#D4AF37]" />,
                        label: t('my_ids'),
                        onClick: () => {},
                        isActive: true,
                      },
                      {
                        icon: <Search className="w-6 h-6 text-[#D4AF37]" />,
                        label: 'Search',
                        onClick: () => {
                          setShowSearchBar(prev => !prev);
                        },
                        isActive: showSearchBar,
                      },
                    ]}
                  />
                </div>
              </div>
            )}

            {/* Home Screen Dock - Show when no profile and not My ID's */}
            {!web3BioProfile && !showMyIDs && !isLoading && (
              <div className="absolute bottom-4 left-0 right-0 z-[9997] flex items-center justify-center">
                <Dock
                  items={[
                    {
                      icon: <User className="w-6 h-6 text-[#D4AF37]" />,
                      label: 'Profile',
                      onClick: () => {
                        if (!walletAddress) {
                          toast.error('Please connect your wallet first');
                        } else {
                          // Load user's profile when wallet is connected
                          handleSearch(walletAddress);
                        }
                      },
                      isActive: false,
                    },
                    {
                      icon: <Pencil className="w-5 h-5 text-[#D4AF37]" />,
                      label: 'My IDs',
                      onClick: () => {
                        if (walletAddress) {
                          setShowMyIDs(true);
                          setActiveDockSection('profile');
                        } else {
                          toast.error('Please connect your wallet first');
                        }
                      },
                      isActive: false,
                    },
                    {
                      icon: <Search className="w-6 h-6 text-[#D4AF37]" />,
                      label: 'Search',
                      onClick: () => {
                        setShowSearchBar(prev => !prev);
                      },
                      isActive: showSearchBar,
                    },
                  ]}
                />
              </div>
            )}

            {/* Results container - Row-based layout with 60fps optimization */}
            {showInitialResults && hasSearched && ensResults.length > 0 && !web3BioProfile && !showMyIDs && (
              <div className="w-full max-w-6xl mx-auto px-4 mt-8 space-y-2 will-change-transform" style={{ transform: 'translateZ(0)' }}>
                {ensResults.map((result, index) => {
                  const isCheckFailed = (window as any).__checkFailedDomains?.has(result.name.toLowerCase());
                  const isTaken = takenSubdomains.has(result.name.toLowerCase());
                  const isComingSoon = result.enabled === false || result.name.toLowerCase() === 'vanity.apt';
                  const fullName = displayQuery ? `${displayQuery}.${result.name}` : result.name;
                  
                   return (
                    <div
                      key={index}
                      className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-background/40 backdrop-blur-sm border border-border/50 rounded-xl hover:bg-background/60 hover:border-border/70 transition-all duration-200 will-change-transform animate-fade-in"
                      style={{ 
                        transform: 'translateZ(0)',
                        animationDelay: `${index * 50}ms`
                      }}
                    >
                      {/* Avatar */}
                      <img
                        src={result.imageUrl || smithCashAvatar}
                        alt={fullName}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover ring-2 ring-border/30 flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.src = smithCashAvatar;
                        }}
                      />

                      {/* Name & Price */}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-foreground text-sm sm:text-base leading-tight">
                          {fullName}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {result.network}
                        </div>
                        <div className="font-bold text-[#D4AF37] text-sm mt-1 text-center">
                          ${displayQuery ? getSubdomainPrice(displayQuery).toFixed(2) : '1.00'}
                        </div>
                      </div>

                      {/* Actions Group */}
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">

                        {/* Info Icon */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 hover:bg-primary/10"
                          onClick={() => {
                            setDetailViewResult(result);
                            setShowDetailView(true);
                          }}
                        >
                          <Info className="h-4 w-4" />
                        </Button>

                        {/* Mint/Coming Soon Button */}
                        <Button
                          variant={isComingSoon || isTaken ? "secondary" : "default"}
                          size="sm"
                          className="font-semibold whitespace-nowrap"
                          disabled={isComingSoon || isTaken}
                          onClick={() => {
                            if (!isComingSoon && !isTaken) {
                              handleMint(result);
                            }
                          }}
                        >
                          <span className="hidden sm:inline">
                            {isTaken ? t('taken') : isComingSoon ? t('coming_soon') : t('mint_now')}
                          </span>
                          <span className="sm:hidden">
                            {isTaken ? t('taken') : isComingSoon ? t('soon') : t('mint')}
                          </span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* No Results State */}
            <div className="w-full sm:max-w-3xl sm:mx-auto px-4">
              {hasSearched && ensResults.length === 0 && !web3BioProfile && !isLoading && !showMyIDs && (
                <div className="text-center py-12 animate-in fade-in duration-500">
                  <p className="text-gray-400 text-lg mb-2">{t('no_results_found')}</p>
                  <p className="text-sm text-gray-500">{t('try_different_query')}</p>
                  {theme === "light" && (
                    <img src={noResultsGif} alt="No results found" className="w-48 h-48 mx-auto mt-6 object-contain" />
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* Bottom spacing for footer */}
      <div className="h-20" />

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
