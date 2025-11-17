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
} from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { supabase } from "@/integrations/supabase/client";
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MiniKit } from "@worldcoin/minikit-js";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "next-themes";
import { SubdomainMintModal } from "@/components/SubdomainMintModal";
import { TonSubdomainMintModal } from "@/components/TonSubdomainMintModal";
import { TonDomainManagementPanel } from "@/components/TonDomainManagementPanel";
import { PersonalizedHeader } from "@/components/PersonalizedHeader";
import { UserDomainsDisplay } from "@/components/UserDomainsDisplay";
import { SpotifyPlayerModal } from "@/components/SpotifyPlayerModal";

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
import defaultHeaderPattern from "@/assets/default-header-pattern.png";
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
import discordIcon from "@/assets/discord-icon.png";
import githubIcon from "@/assets/github-icon.png";
import whatsappIcon from "@/assets/whatsapp-icon.png";
import blueskyIcon from "@/assets/bluesky-icon.png";
import instagramIcon from "@/assets/instagram-icon.png";
import linkedinIcon from "@/assets/linkedin-icon.png";
import worldAppIcon from "@/assets/world-app-icon.png";
import telegramIcon from "@/assets/telegram-icon.png";
import { DynamicMetaTags } from "@/components/DynamicMetaTags";
import { WorldIdAnimation } from "@/components/WorldIdAnimation";
import noResultsGif from "@/assets/no-results.gif";
import { PoapCarousel } from "@/components/PoapCarousel";

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
  const [showTonMintModal, setShowTonMintModal] = useState(false);
  const [showTonManagementPanel, setShowTonManagementPanel] = useState(false);
  const [selectedTonDomain, setSelectedTonDomain] = useState<any>(null);
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
    
    const handleManageTonDomainEvent = (event: CustomEvent) => {
      handleManageTonDomain(event.detail.domain);
    };
    window.addEventListener("manage-ton-domain", handleManageTonDomainEvent as EventListener);

    return () => {
      window.removeEventListener("wallet-connected", handleWalletChange as EventListener);
      window.removeEventListener("wallet-disconnected", () => {
        setWalletAddress(undefined);
        setShowMyIDs(false);
      });
      window.removeEventListener("show-my-ids", handleShowMyIDs);
      window.removeEventListener("show-search", handleShowSearch);
      window.removeEventListener("manage-ton-domain", handleManageTonDomainEvent as EventListener);
    };
  }, []);


  const protocols = ["DNS", "ENS", "Aptos", "HyperLiquid", "TON"];
  const clubs = ["Crypto", "DeFi", "Dev", "Digits", "Surname", "Startup", "Artist", "Personal"];

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

  const handleFilterChange = (type: "protocol" | "club", value: string) => {
    if (type === "protocol") {
      handleProtocolToggle(value);
    } else {
      handleClubToggle(value);
    }
  };

  const handleToggleAllClubs = () => {
    setHasManuallyAdjustedFilters(true);
    if (filters.club.length === clubs.length) {
      // Deselect all
      setFilters({ ...filters, club: [] });
    } else {
      // Select all
      setFilters({ ...filters, club: clubs });
    }
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
        enabled: true,
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
        category: ["HyperLiquid"],
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

    // Check if query is a wallet address (starts with 0x and 42 characters)
    const isWalletAddress = trimmedQuery && trimmedQuery.startsWith("0x") && trimmedQuery.length === 42;

    // If query contains a dot OR is a wallet address, try fetching profile
    if (trimmedQuery && (trimmedQuery.includes(".") || isWalletAddress)) {
      // Normalize for matching (users may type with caps)
      const normalizedQuery = trimmedQuery.toLowerCase();

      // Use web3.bio for ALL lookups - it supports .eth, .box, wallet addresses, and more
      console.log('🔍 Fetching web3.bio profile for:', normalizedQuery);
      try {
        // Retry logic with timeout for reliability
        const fetchWithRetry = async (url: string, retries = 3, timeout = 10000) => {
          for (let i = 0; i < retries; i++) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), timeout);
              
              const response = await fetch(url, { 
                signal: controller.signal,
                headers: {
                  'Accept': 'application/json',
                }
              });
              
              clearTimeout(timeoutId);
              
              if (!response.ok) {
                throw new Error(`Web3.bio API error: ${response.statusText}`);
              }
              
              return response;
            } catch (error) {
              if (i === retries - 1) throw error;
              console.log(`Retry ${i + 1}/${retries} for web3.bio API...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
            }
          }
          throw new Error('Max retries reached');
        };
        
        const response = await fetchWithRetry(`https://api.web3.bio/profile/${trimmedQuery}`);
        const data = await response.json();

        // Only process if we got valid data (has results)
        if (data && Array.isArray(data) && data.length > 0) {
          const profileData = data[0];
          console.log('✅ Web3.bio profile data:', profileData);
          setWeb3BioProfile(profileData);
          setEnsResults([]);

          // Fetch ENS text records (for .eth inputs OR any input that resolves to a primary ENS name)
          let ensTextRecords: Record<string, string> = {};
          try {
            const publicClient = createPublicClient({
              chain: mainnet,
              transport: http(),
            });

            // Determine ENS name to read text records from
            let ensNameToQuery: string | null = null;

            if (normalizedQuery.endsWith('.eth')) {
              // Direct .eth lookup
              ensNameToQuery = normalize(trimmedQuery);
            } else if (profileData.address) {
              // Resolve primary ENS name from the returned address
              try {
                const primary = await publicClient.getEnsName({ address: profileData.address as `0x${string}` });
                if (primary) ensNameToQuery = normalize(primary);
              } catch (_) {
                /* ignore ENS name resolution failure */
              }
            }

            if (ensNameToQuery) {
              console.log('Fetching ENS text records for:', ensNameToQuery);
              // All standard ENS text record keys + common social platforms
              const textRecordKeys = [
                'display', 'description', 'email', 'keywords', 'location', 'name', 'notice', 'phone', 'url', 'avatar', 'header',
                'com.twitter', 'com.github', 'com.discord', 'com.reddit', 'com.youtube', 'com.facebook', 'com.spotify', 'com.linkedin', 'com.instagram',
                'org.telegram', 'io.keybase', 'vnd.twitter', 'vnd.github',
              ];

              // Fetch all text records in parallel with a timeout
              const fetchPromises = textRecordKeys.map((key) =>
                Promise.race([
                  publicClient.getEnsText({ name: ensNameToQuery!, key }),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
                ]).catch(() => null),
              );

              const textValues = await Promise.all(fetchPromises);

              // Build records object with all non-null values
              textRecordKeys.forEach((key, index) => {
                if (textValues[index]) {
                  ensTextRecords[key] = textValues[index] as string;
                }
              });
              console.log('Fetched ENS text records:', ensTextRecords);
            }
          } catch (ensError) {
            console.error('Error fetching ENS text records:', ensError);
          }

          // Build ENS-like text records from web3.bio profile + direct ENS records
          try {
            const records: Record<string, string> = {};
            
            // Start with ENS records (if .eth domain)
            Object.assign(records, ensTextRecords);
            
            // Fallback to web3.bio data if ENS records are missing
            if (!records.email && profileData?.email) records.email = profileData.email;
            if (!records.avatar && profileData?.avatar) records.avatar = profileData.avatar;
            if (!records.description && profileData?.description) records.description = profileData.description;
            if (!records.location && profileData?.location) records.location = profileData.location;
            
            const website = profileData?.links?.website?.link || profileData?.url;
            if (!records.url && website) records.url = website;
            
            const links = profileData?.links || {};
            if (!records['com.twitter'] && links?.twitter?.handle) {
              records['com.twitter'] = String(links.twitter.handle).replace(/^@/, '');
            }
            if (!records['com.github'] && links?.github?.handle) {
              records['com.github'] = String(links.github.handle).replace(/^@/, '');
            }
            if (!records['com.discord'] && links?.discord?.handle) {
              records['com.discord'] = String(links.discord.handle);
            }
            if (!records['org.telegram'] && links?.telegram?.handle) {
              records['org.telegram'] = String(links.telegram.handle).replace(/^@/, '');
            }
            if (!records.contenthash && profileData?.contenthash) {
              records.contenthash = String(profileData.contenthash);
            }

            setEnsRecords({
              name: trimmedQuery,
              address: profileData?.address,
              avatar: records.avatar || profileData?.avatar,
              records,
            });

            // Update web3BioProfile with ENS social links
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
                link: `https://instagram.com/${ensTextRecords['com.instagram']}`,
                handle: ensTextRecords['com.instagram']
              };
            }
            if (ensTextRecords['url']) {
              updatedProfile.links.website = {
                link: ensTextRecords['url']
              };
            }
            
            // Update header from ENS text record if available
            if (ensTextRecords['header']) {
              updatedProfile.header = ensTextRecords['header'];
            }
            
            setWeb3BioProfile(updatedProfile);
          } catch (e) {
            console.warn('Failed to map web3.bio profile to ENS records:', e);
          }

          // Fetch EFP stats and ENS records if we have an address or ENS name
          if (profileData.address || trimmedQuery.includes(".eth")) {
            const addressOrName = profileData.address || trimmedQuery;

            // Fetch EFP stats using the ethfollow.xyz API directly
            try {
              const efpResponse = await fetch(`https://api.ethfollow.xyz/api/v1/users/${addressOrName}/stats`);

              if (efpResponse.ok) {
                const efpData = await efpResponse.json();
                setEfpStats({
                  followers_count: parseInt(efpData.followers_count) || 0,
                  following_count: parseInt(efpData.following_count) || 0,
                });
              }
            } catch (efpError) {
              console.error("Error fetching EFP stats:", efpError);
            }

            // Fetch POAP data
            if (profileData.address) {
              try {
                setIsLoadingPoaps(true);
                const { data: poapData, error: poapError } = await supabase.functions.invoke("get-poap-data", {
                  body: { walletAddress: profileData.address },
                });

                if (!poapError && poapData?.success) {
                  setPoapCount(poapData.count || 0);
                } else {
                  console.error("Error fetching POAP data:", poapError);
                  setPoapCount(0);
                }
              } catch (poapFetchError) {
                console.error("Error fetching POAPs:", poapFetchError);
                setPoapCount(0);
              } finally {
                setIsLoadingPoaps(false);
              }
            }
          }
        }
      } catch (error) {
        console.log("web3.bio failed:", error);
      }

      setIsLoading(false);
      return;
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

  const handleMint = (result: ENSResult) => {
    setSelectedResult(result);
    // Check if this is vanity.ton
    if (result.name.toLowerCase() === 'vanity.ton') {
      setShowTonMintModal(true);
    } else {
      setShowMintInterface(true);
    }
  };

  const handleBackToResults = () => {
    setShowMintInterface(false);
    setShowTonMintModal(false);
    setShowTonManagementPanel(false);
    setSelectedResult(null);
    setSelectedTonDomain(null);
  };

  const handleManageTonDomain = (domain: any) => {
    setSelectedTonDomain(domain);
    setShowTonManagementPanel(true);
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

      {/* TON Subdomain Mint Modal */}
      <TonSubdomainMintModal
        isOpen={showTonMintModal}
        onClose={handleBackToResults}
      />

      {/* TON Domain Management Panel */}
      {showTonManagementPanel && selectedTonDomain && (
        <TonDomainManagementPanel
          domain={selectedTonDomain}
          onBack={handleBackToResults}
        />
      )}

      <div className="w-full">
        {/* Show mint interface when a result is selected */}
        {showMintInterface && selectedResult && !showTonManagementPanel ? (
          <SubdomainMintModal
            isOpen={true}
            onClose={handleBackToResults}
            subdomain={displayQuery ? `${displayQuery}.${selectedResult.name}` : selectedResult.name}
            price={price}
            resultAvatar={selectedResult.imageUrl}
            domain={selectedResult.name.trim().toLowerCase()}
          />
        ) : !showTonManagementPanel ? (
          <>
            <DynamicMetaTags
              username={web3BioProfile?.identity || displayQuery}
              displayName={web3BioProfile?.displayName}
              description={web3BioProfile?.description}
              avatar={web3BioProfile?.avatar}
              banner={web3BioProfile?.header}
            />
            
            {/* Search bar and header - always shown */}
            {!showMyIDs && (
              <>
                {/* Header always at the top */}
                <div className="mt-2">
                  <PersonalizedHeader 
                    user={{ walletAddress }} 
                    resultsCount={showInitialResults && hasSearched && ensResults.length > 0 ? ensResults.length : undefined}
                  />
                </div>
                
                {/* Search bar below header */}
                <div className="w-full max-w-md mx-auto mb-3 relative z-50 transition-all duration-300 mt-2">
                  <div className="relative">
                    <div className="absolute left-1 top-1 z-10 flex items-center h-10">
                      <DropdownMenu open={showFilterDropdown} onOpenChange={setShowFilterDropdown}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 rounded-lg bg-[#D4AF37] hover:bg-[#D4AF37]/90 border-[#D4AF37]"
                          >
                            <Filter className="w-4 h-4 text-black" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          className="w-72 bg-white dark:bg-gray-900 backdrop-blur-md border-[#D4AF37]/50 shadow-xl z-50"
                        >
                          <div className="p-2">
                            <div className="space-y-3">
                              <div>
                                <DropdownMenuLabel className="text-[#D4AF37] text-xs uppercase tracking-wider mb-2 px-2">
                                  Protocol
                                </DropdownMenuLabel>
                                <div className="grid grid-cols-2 gap-2">
                                  {protocols.slice(0, 4).map((protocol) => (
                                    <button
                                      key={protocol}
                                      onClick={() => handleFilterChange("protocol", protocol)}
                                      className={cn(
                                        "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                                        filters.protocol.includes(protocol)
                                          ? "bg-[#D4AF37] text-black"
                                          : "bg-gray-800/50 dark:bg-gray-800/50 light:bg-white/50 text-white dark:text-white light:text-black hover:bg-gray-700/50 dark:hover:bg-gray-700/50 light:hover:bg-gray-100/50"
                                      )}
                                    >
                                      {protocol}
                                    </button>
                                  ))}
                                </div>
                                {/* TON protocol on its own row, centered */}
                                {protocols.length > 4 && (
                                  <div className="flex justify-center mt-2">
                                    <button
                                      onClick={() => handleFilterChange("protocol", protocols[4])}
                                      className={cn(
                                        "px-3 py-2 rounded-lg text-sm font-medium transition-all w-[calc(50%-0.25rem)]",
                                        filters.protocol.includes(protocols[4])
                                          ? "bg-[#D4AF37] text-black"
                                          : "bg-gray-800/50 dark:bg-gray-800/50 light:bg-white/50 text-white dark:text-white light:text-black hover:bg-gray-700/50 dark:hover:bg-gray-700/50 light:hover:bg-gray-100/50"
                                      )}
                                    >
                                      {protocols[4]}
                                    </button>
                                  </div>
                                )}
                              </div>

                              <DropdownMenuSeparator className="bg-[#D4AF37]/30" />

                              <div>
                                <DropdownMenuLabel className="text-[#D4AF37] text-xs uppercase tracking-wider mb-2 px-2 flex items-center justify-between">
                                  <span>
                                    Club
                                  </span>
                                  <button
                                    onClick={handleToggleAllClubs}
                                    className="text-xs normal-case text-[#D4AF37] hover:text-[#D4AF37]/80 font-normal"
                                  >
                                    {filters.club.length === clubs.length ? "Deselect All" : "Select All"}
                                  </button>
                                </DropdownMenuLabel>
                                <div className="grid grid-cols-2 gap-2">
                                  {clubs.map((club) => (
                                    <button
                                      key={club}
                                      onClick={() => handleFilterChange("club", club)}
                                      className={cn(
                                        "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                                        filters.club.includes(club)
                                          ? "bg-[#D4AF37] text-black"
                                          : "bg-gray-800/50 dark:bg-gray-800/50 light:bg-white/50 text-white dark:text-white light:text-black hover:bg-gray-700/50 dark:hover:bg-gray-700/50 light:hover:bg-gray-100/50"
                                      )}
                                    >
                                      {club}
                                    </button>
                                  ))}
                                </div>
                              </div>


                              <DropdownMenuSeparator className="bg-[#D4AF37]/30" />
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowFilterDropdown(false)}
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
                            setHasSearched(false);
                            setWeb3BioProfile(null);
                            setIsSearchActive(false);
                            setShowInitialResults(false);
                            onClearSearch?.();
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
                        size="icon"
                        className="h-10 w-10 rounded-lg bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold"
                      >
                        <Search className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Web3.bio Profile Result - Social Media Style - Only show when search is active and My IDs is not showing */}
            {web3BioProfile && hasSearched && !showMyIDs && (
              <div className="w-full sm:max-w-3xl sm:mx-auto mt-8">
                <Card className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 light:bg-white/70 light:backdrop-blur-md border-2 border-[#D4AF37]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden">
                  {/* Header/Banner */}
                  <div className="relative h-32 sm:h-48 bg-gradient-to-r from-[#D4AF37]/20 via-[#F7E06C]/10 to-[#D4AF37]/20">
                    {web3BioProfile.header ? (
                      <img src={web3BioProfile.header} alt="Profile header" className="w-full h-full object-cover" />
                    ) : (
                      <img src={defaultHeaderPattern} alt="Default header" className="w-full h-full object-cover opacity-60" />
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
                            const event = new CustomEvent("show-toast", {
                              detail: {
                                title: "Link Copied!",
                                description: "Profile link copied to clipboard",
                              },
                            });
                            window.dispatchEvent(event);
                          }
                        } catch (err) {
                          console.error("Error sharing:", err);
                        }
                      }}
                    >
                      <Share2 className="h-4 w-4 text-[#D4AF37]" />
                    </Button>
                  </div>

                  <CardContent className="relative -mt-16 sm:-mt-20 px-4 sm:px-6 pb-6 flex flex-col items-center">
                    {/* Avatar - No description overlay */}
                    <div className="relative inline-block mb-2">
                      <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37] to-[#F7E06C] rounded-full blur-xl opacity-60"></div>
                      <div className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-full border-4 border-[#D4AF37] overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.6)] bg-gray-800">
                        {web3BioProfile.avatar ? (
                          <img
                            src={web3BioProfile.avatar}
                            alt={web3BioProfile.displayName || searchQuery}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl text-white font-bold rounded-full">
                            {(web3BioProfile.displayName || searchQuery).charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Profile Info - Centered */}
                    <div className="space-y-1 flex flex-col items-center text-center w-full max-w-2xl mx-auto">
                      <div className="flex flex-col items-center w-full">
                        <h3 className="text-2xl sm:text-3xl font-bold text-white dark:text-white light:text-black mb-1">
                          {web3BioProfile.displayName || searchQuery}
                        </h3>
                        
                        {/* Description below subdomain - full width with better shadow */}
                        {web3BioProfile.description && (
                          <div className="w-full max-w-3xl px-4 mb-2">
                            <p 
                              className="text-base sm:text-lg leading-relaxed text-center font-medium"
                              style={{
                                color: '#D4AF37',
                                textShadow: '0 2px 8px rgba(0, 0, 0, 0.9), 0 0 3px rgba(0, 0, 0, 1), -1px -1px 0 black, 1px -1px 0 black, -1px 1px 0 black, 1px 1px 0 black'
                              }}
                            >
                              {web3BioProfile.description}
                            </p>
                          </div>
                        )}
                        
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
                                const event = new CustomEvent("show-toast", {
                                  detail: {
                                    title: "Copied!",
                                    description: "Wallet address copied to clipboard",
                                  },
                                });
                                window.dispatchEvent(event);
                              }}
                            >
                              <Copy className="h-3 w-3 text-[#D4AF37]" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Contact and Location */}
                      <div className="flex flex-col gap-2 text-sm text-gray-400 dark:text-gray-400 light:text-gray-700 items-center">
                        {(ensRecords?.records?.email || web3BioProfile.email) && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            <span>{ensRecords?.records?.email || web3BioProfile.email}</span>
                          </div>
                        )}
                        {web3BioProfile.links?.website && (
                          <a
                            href={web3BioProfile.links.website.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 hover:text-[#D4AF37] transition-colors"
                          >
                            <Globe className="w-4 h-4" />
                            <span>{web3BioProfile.links.website.link.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                          </a>
                        )}
                        {web3BioProfile.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{web3BioProfile.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                      {/* Follower Stats */}
                      <div className="flex gap-6 pt-2">
                        <button
                          onClick={async () => {
                            if (!web3BioProfile.address || isLoadingEFP) return;
                            setIsLoadingEFP(true);
                            setFollowingPage(0);
                            setFollowingSearchQuery("");
                            try {
                              const response = await fetch(
                                `https://api.ethfollow.xyz/api/v1/users/${web3BioProfile.address}/following?limit=5&offset=0`,
                              );
                              if (response.ok) {
                                const data = await response.json();
                                const followingData = data.following || [];
                                setTotalFollowing(efpStats?.following_count || 0);
                                setFollowingList(followingData);
                                setShowFollowingList(true);
                              }
                            } catch (error) {
                              console.error("Error fetching following list:", error);
                            } finally {
                              setIsLoadingEFP(false);
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
                            if (!web3BioProfile.address || isLoadingEFP) return;
                            setIsLoadingEFP(true);
                            setFollowersPage(0);
                            setFollowersSearchQuery("");
                            try {
                              const response = await fetch(
                                `https://api.ethfollow.xyz/api/v1/users/${web3BioProfile.address}/followers?limit=5&offset=0`,
                              );
                              if (response.ok) {
                                const data = await response.json();
                                const followersData = data.followers || [];
                                setTotalFollowers(efpStats?.followers_count || 0);
                                setFollowersList(followersData);
                                setShowFollowersList(true);
                              }
                            } catch (error) {
                              console.error("Error fetching followers list:", error);
                            } finally {
                              setIsLoadingEFP(false);
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

                      {/* Social Links - Flexbox layout that centers dynamically */}
                      <div className="flex flex-wrap justify-center gap-4 pt-2 px-4">
                        {web3BioProfile.links && Object.entries(web3BioProfile.links).map(([platform, linkData]: [string, any]) => {
                          if (!linkData || platform === 'website') return null;
                          
                          const socialIcons: { [key: string]: string } = {
                            twitter: 'https://cdn-icons-png.flaticon.com/512/5969/5969020.png',
                            telegram: 'https://cdn.pixabay.com/photo/2021/12/27/10/50/telegram-6896827_1280.png',
                            youtube: 'https://cdn-icons-png.flaticon.com/512/5968/5968852.png',
                            facebook: 'https://cdn-icons-png.flaticon.com/512/733/733547.png',
                            spotify: 'https://cdn-icons-png.flaticon.com/512/174/174872.png',
                            discord: discordIcon,
                            github: githubIcon,
                            whatsapp: whatsappIcon,
                            bluesky: blueskyIcon,
                            instagram: instagramIcon,
                            linkedin: linkedinIcon,
                          };
                          
                          // Construct href when ENS record only provided a handle
                          let href = linkData.link as string | undefined;
                          const p = platform.toLowerCase();
                          const handle = (linkData.handle || '').replace(/^@/, '');
                          if (!href && handle) {
                            if (p === 'telegram') href = `https://t.me/${handle}`;
                            else if (p === 'twitter' || p === 'x') href = `https://twitter.com/${handle}`;
                            else if (p === 'github') href = `https://github.com/${handle}`;
                            else if (p === 'instagram') href = `https://instagram.com/${handle}`;
                            else if (p === 'linkedin') href = `https://linkedin.com/in/${handle}`;
                            else if (p === 'bluesky') href = `https://bsky.app/profile/${handle}`;
                            else if (p === 'facebook') href = `https://facebook.com/${handle}`;
                            else if (p === 'youtube') href = `https://youtube.com/${handle}`;
                            else if (p === 'spotify') href = handle.startsWith('http') ? handle : `https://open.spotify.com/user/${handle}`;
                          }
                          if (!href) href = '#';
                          
                          return (
                            <a
                              key={platform}
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative"
                              title={`@${linkData.handle || platform}`}
                            >
                              {socialIcons[platform.toLowerCase()] ? (
                                <div className={cn(
                                  "w-12 h-12 rounded-lg transition-transform group-hover:scale-110",
                                  platform.toLowerCase() === 'github' && "dark:bg-white dark:p-1"
                                )}>
                                  <img 
                                    src={socialIcons[platform.toLowerCase()]} 
                                    alt={platform}
                                    className="w-full h-full rounded-lg"
                                  />
                                </div>
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center transition-transform group-hover:scale-110">
                                  <ExternalLink className="w-6 h-6 text-white" />
                                </div>
                              )}
                            </a>
                          );
                        })}
                      </div>

                      {/* POAP Collection */}
                      {web3BioProfile.address && poapCount > 0 && (
                      <div className="pt-4 mt-4 border-t border-gray-700/50">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <img src={poapLogo} alt="POAP" className="w-5 h-5" />
                          <h4 className="text-sm font-semibold text-white">
                            POAPs ({poapCount})
                          </h4>
                        </div>
                        <PoapCarousel walletAddress={web3BioProfile.address} />
                      </div>
                    )}

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
                <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 light:bg-white/70 light:backdrop-blur-md border-2 border-[#D4AF37]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] w-full max-w-sm max-h-[60vh] overflow-hidden flex flex-col pointer-events-auto">
                  <div className="flex items-center justify-between p-4 border-b border-[#D4AF37]/30">
                    <h3 className="text-lg font-bold text-white dark:text-white light:text-black">Followers ({totalFollowers})</h3>
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
                        {isLoadingMore ? "Loading..." : "Load More"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Following List Modal */}
            {showFollowingList && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 light:bg-white/70 light:backdrop-blur-md border-2 border-[#D4AF37]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] w-full max-w-sm max-h-[60vh] overflow-hidden flex flex-col pointer-events-auto">
                  <div className="flex items-center justify-between p-4 border-b border-[#D4AF37]/30">
                    <h3 className="text-lg font-bold text-white dark:text-white light:text-black">Following ({totalFollowing})</h3>
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
                        {isLoadingMore ? "Loading..." : "Load More"}
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

            {/* Results container - Row-based layout with 60fps optimization */}
            {showInitialResults && hasSearched && ensResults.length > 0 && !web3BioProfile && !showMyIDs && (
              <div className="w-full max-w-6xl mx-auto px-4 mt-8 mb-20 max-h-[calc(100vh-300px)] overflow-y-auto space-y-2 will-change-transform" style={{ transform: 'translateZ(0)' }}>
                {ensResults.map((result, index) => {
                  const isCheckFailed = (window as any).__checkFailedDomains?.has(result.name.toLowerCase());
                  const isTaken = takenSubdomains.has(result.name.toLowerCase());
                  const isComingSoon = result.enabled === false;
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

                      {/* Name & Category */}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-foreground text-sm sm:text-base leading-tight">
                          {fullName}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {Array.isArray(result.category) ? result.category.join('+') : result.category}
                        </div>
                      </div>

                      {/* Price & Actions Group */}
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        {/* Price - visible on larger screens */}
                        <div className="text-right hidden sm:block">
                          <div className="font-bold text-[#D4AF37] text-base">
                            ${result.price?.toFixed(2) || '5.00'}
                          </div>
                          <div className="text-xs text-muted-foreground">USD</div>
                        </div>

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
                            {isTaken ? "Taken" : isComingSoon ? "Coming Soon" : "Mint Now"}
                          </span>
                          <span className="sm:hidden">
                            {isTaken ? "Taken" : isComingSoon ? "Soon" : "Mint"}
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
                  <p className="text-gray-400 text-lg mb-2">No results found</p>
                  <p className="text-sm text-gray-500">Try searching with a different query</p>
                  {theme === "light" && (
                    <img src={noResultsGif} alt="No results found" className="w-48 h-48 mx-auto mt-6 object-contain" />
                  )}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
      
      {/* Bottom spacing for scroll */}
      <div className="h-32" />

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
