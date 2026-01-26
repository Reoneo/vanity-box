// src/components/SearchInterface.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  X,
  Loader2,
  Home,
  User,
  Users,
  Image as ImageIcon,
  Coins,
  Globe,
  Link2,
  ChevronDown,
} from "lucide-react";
import { useWalletConnect } from "@/contexts/WalletConnectContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ensNormalize } from "viem/ens";
import { ProfileCard } from "@/components/ProfileCard";
import Dock from "@/components/Dock";
import ensLogo from "@/assets/ens-logo-dark.svg";
import patternTiles from "@/assets/pattern-tiles.jpeg";

// NOTE:
// This file is large in your project; I'm pasting the full file as requested.
// If you ever want this as a small patch instead, ask and I'll provide a minimal diff.

interface EnsResult {
  name: string;
  address: string | null;
  avatar: string | null;
  displayName: string | null;
  description: string | null;
  website: string | null;
  header: string | null;
  url: string | null;
  links: any;
  followerCount?: number | null;
  followingCount?: number | null;
  ensRecords?: any;
  hlDomain?: string;
  hlNfts?: any[];
  hlTokens?: any[];
  vetDomain?: string;
  farcaster?: any;
  location?: string | null;
  email?: string | null;
}

type DockSection = "profile" | "socials" | "nfts" | "farcaster";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper: safe normalize
function safeNormalize(input: string) {
  try {
    return ensNormalize(input);
  } catch {
    return input;
  }
}

export const SearchInterface = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { walletAddress, isConnected, openWalletModal } = useWalletConnect();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [displayQuery, setDisplayQuery] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Results
  const [ensResults, setEnsResults] = useState<EnsResult[]>([]);
  const [web3BioProfile, setWeb3BioProfile] = useState<any | null>(null);

  // UI state
  const [showSearchBar, setShowSearchBar] = useState(true);
  const [hadPreviousProfile, setHadPreviousProfile] = useState(false);
  const [showMyIDs, setShowMyIDs] = useState(false);

  // Dock + sections
  const [activeDockSection, setActiveDockSection] = useState<DockSection>("profile");

  // Loading states
  const [loading, setLoading] = useState(false);

  // Data states
  const [efpStats, setEfpStats] = useState<any | null>(null);
  const [ensRecords, setEnsRecords] = useState<any | null>(null);
  const [nfts, setNfts] = useState<any[]>([]);
  const [nftLoading, setNftLoading] = useState(false);
  const [nftNextCursor, setNftNextCursor] = useState<string | null>(null);
  const [openseaAttempted, setOpenseaAttempted] = useState(false);
  const [openseaHasErrors, setOpenseaHasErrors] = useState(false);
  const [poapTokens, setPoapTokens] = useState<any[]>([]);
  const [latestCast, setLatestCast] = useState<any | null>(null);
  const [castLoading, setCastLoading] = useState(false);
  const [firstTransactionDate, setFirstTransactionDate] = useState<string | null>(null);

  // Social icons
  const [socialIcons, setSocialIcons] = useState<Record<string, string>>({});

  // Ref guards
  const requestIdRef = useRef(0);

  const normalizedQuery = useMemo(() => safeNormalize(searchQuery.trim()), [searchQuery]);

  // -----------------------
  // Fetch helpers (Supabase edge functions)
  // -----------------------
  const callEdge = async (path: string, payload: any) => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        apikey: key,
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.error || `Edge function error: ${res.status}`;
      throw new Error(msg);
    }
    return json;
  };

  const fetchProfile = async (identity: string) => {
    return callEdge("resolve-profile", { identity });
  };

  const fetchEfp = async (address: string) => {
    return callEdge("efp-stats", { address });
  };

  const fetchEnsRecords = async (identity: string) => {
    return callEdge("get-ens-records", { identity });
  };

  const fetchNfts = async (address: string, cursor?: string | null) => {
    return callEdge("nfts", { address, cursor: cursor || null });
  };

  const fetchPoaps = async (walletAddress: string) => {
    return callEdge("poaps", { walletAddress });
  };

  const fetchFarcaster = async (address: string) => {
    return callEdge("farcaster-latest", { address });
  };

  const fetchFirstTx = async (address: string) => {
    return callEdge("first-transaction-date", { address });
  };

  // -----------------------
  // Search flow
  // -----------------------
  const handleSearch = async () => {
    const q = normalizedQuery;
    if (!q) return;

    const reqId = ++requestIdRef.current;
    setLoading(true);
    setHasSearched(true);
    setIsSearchActive(true);
    setDisplayQuery(q);

    try {
      const result = await fetchProfile(q);
      if (requestIdRef.current !== reqId) return;

      if (!result?.ok || !result?.profile) {
        setWeb3BioProfile(null);
        setEnsResults([]);
        toast({
          title: "Not found",
          description: "No profile found for that identity.",
          variant: "destructive",
        });
        return;
      }

      setWeb3BioProfile(result.profile);
      setHadPreviousProfile(true);
      setShowSearchBar(false);
      setActiveDockSection("profile");

      // side fetches
      const addr = result.profile.address;
      if (addr) {
        fetchEfp(addr)
          .then((r) => setEfpStats(r?.stats || null))
          .catch(() => setEfpStats(null));
        fetchFarcaster(addr)
          .then((r) => setLatestCast(r?.cast || null))
          .catch(() => setLatestCast(null));
        fetchFirstTx(addr)
          .then((r) => setFirstTransactionDate(r?.date || null))
          .catch(() => setFirstTransactionDate(null));

        // NFTs
        setNftLoading(true);
        setOpenseaAttempted(false);
        setOpenseaHasErrors(false);
        fetchNfts(addr, null)
          .then((r) => {
            setNfts(r?.nfts || []);
            setNftNextCursor(r?.nextCursor || null);
            setOpenseaAttempted(true);
            setOpenseaHasErrors(Boolean(r?.errors?.length));
          })
          .catch(() => {
            setNfts([]);
            setNftNextCursor(null);
            setOpenseaAttempted(true);
            setOpenseaHasErrors(true);
          })
          .finally(() => setNftLoading(false));

        // POAPs
        fetchPoaps(addr)
          .then((r) => setPoapTokens(r?.poaps || []))
          .catch(() => setPoapTokens([]));
      }

      // ENS records for identity
      fetchEnsRecords(q)
        .then((r) => setEnsRecords(r?.records || null))
        .catch(() => setEnsRecords(null));
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Search failed",
        description: e?.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      if (requestIdRef.current === reqId) setLoading(false);
    }
  };

  const handleClear = () => {
    setSearchQuery("");
    setDisplayQuery("");
    setEnsResults([]);
    setWeb3BioProfile(null);
    setEfpStats(null);
    setEnsRecords(null);
    setNfts([]);
    setPoapTokens([]);
    setLatestCast(null);
    setFirstTransactionDate(null);
    setIsSearchActive(false);
    setHasSearched(false);
    setShowSearchBar(true);
    setHadPreviousProfile(false);
    setShowMyIDs(false);
  };

  const handleFollowingClick = () => {
    setActiveDockSection("socials");
  };

  const handleFollowersClick = () => {
    setActiveDockSection("socials");
  };

  const handleLoadMoreNfts = async () => {
    if (!web3BioProfile?.address || !nftNextCursor || nftLoading) return;
    setNftLoading(true);
    try {
      const r = await fetchNfts(web3BioProfile.address, nftNextCursor);
      setNfts((prev) => [...prev, ...(r?.nfts || [])]);
      setNftNextCursor(r?.nextCursor || null);
    } catch {
      // ignore
    } finally {
      setNftLoading(false);
    }
  };

  // Prevent search bar reappearing
  useEffect(() => {
    if (web3BioProfile && !showSearchBar) return;
    if (!web3BioProfile && hadPreviousProfile) {
      setShowSearchBar(true);
    }
  }, [web3BioProfile, showSearchBar, hadPreviousProfile]);

  // -----------------------
  // Render
  // -----------------------
  return (
    <div className="relative w-full h-full">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `url(${patternTiles})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Search Bar */}
      {showSearchBar && (
        <div className="w-full h-full flex flex-col items-center justify-center px-4">
          <div className="w-full max-w-xl space-y-4">
            <div className="relative">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search a name, wallet, ENS, Farcaster..."
                className="pr-12 bg-black/40 border-[#D4AF37]/30 text-white placeholder:text-white/60"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                  aria-label="Clear"
                >
                  <X className="w-5 h-5" />
                </button>
              ) : (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60">
                  <Search className="w-5 h-5" />
                </span>
              )}
            </div>

            <Button
              onClick={handleSearch}
              disabled={!normalizedQuery || loading}
              className="w-full bg-[#D4AF37] text-black hover:bg-[#F4E4BC]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                "Search"
              )}
            </Button>

            {!isConnected && (
              <Button
                variant="outline"
                onClick={openWalletModal}
                className="w-full border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10"
              >
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Results / Profile */}
      {!showSearchBar && (
        <div className="relative w-full h-full">
          {/* Top action row */}
          <div className="absolute top-3 left-3 right-3 z-[9999] flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleClear}
              className="border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10"
            >
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowSearchBar(true)}
              className="border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10"
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>

          {/* Profile Card - fixed positioning regardless of search bar */}
          {web3BioProfile && !showMyIDs ? (
            <div className="fixed left-0 right-0 top-[80px] bottom-0 px-0 pt-0 flex flex-col z-[9997] bg-black">
              {/*
                Make the profile container reach the footer (no visual gap),
                while keeping enough internal padding so the Dock/footer don't overlap content.
              */}
              <div className="flex-1 min-h-0 overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+112px)] md:pb-[calc(env(safe-area-inset-bottom,0px)+176px)]">
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
                    // Only fetch if not already attempted and not currently loading
                    if (!openseaAttempted && !nftLoading && web3BioProfile?.address) {
                      console.log("🔄 On-demand: Fetching OpenSea NFTs for:", web3BioProfile.address);
                      fetchNfts(web3BioProfile.address);
                    }
                  }}
                />
              </div>
            </div>
          ) : null}

          {/* Profile Dock - separate from profile container for proper z-index stacking */}
          {web3BioProfile && !showMyIDs && (
            <Dock
              items={[
                ...(web3BioProfile
                  ? [
                      {
                        icon: <Home className="w-6 h-6 text-[#D4AF37]" />,
                        label: "Home",
                        onClick: (e: any) => {
                          e.stopPropagation();
                          setShowSearchBar(false);
                          setHadPreviousProfile(false);
                          setWeb3BioProfile(null);
                          setEfpStats(null);
                          setEnsRecords(null);
                          setIsSearchActive(false);
                          setHasSearched(false);
                          setSearchQuery("");
                          setDisplayQuery("");
                          setEnsResults([]);
                          setNfts([]);
                          setPoapTokens([]);
                          setLatestCast(null);
                          setFirstTransactionDate(null);
                          setShowSearchBar(true);
                          setHadPreviousProfile(false);
                        },
                      },
                    ]
                  : []),
                {
                  icon: <User className="w-6 h-6 text-[#D4AF37]" />,
                  label: "Profile",
                  isActive: activeDockSection === "profile",
                  onClick: (e: any) => {
                    e.stopPropagation();
                    setActiveDockSection("profile");
                  },
                },
                {
                  icon: <Users className="w-6 h-6 text-[#D4AF37]" />,
                  label: "Social",
                  isActive: activeDockSection === "socials",
                  onClick: (e: any) => {
                    e.stopPropagation();
                    setActiveDockSection("socials");
                  },
                },
                {
                  icon: <ImageIcon className="w-6 h-6 text-[#D4AF37]" />,
                  label: "NFTs",
                  isActive: activeDockSection === "nfts",
                  onClick: (e: any) => {
                    e.stopPropagation();
                    setActiveDockSection("nfts");
                  },
                },
                {
                  icon: <Coins className="w-6 h-6 text-[#D4AF37]" />,
                  label: "Tokens",
                  isActive: activeDockSection === "farcaster",
                  onClick: (e: any) => {
                    e.stopPropagation();
                    setActiveDockSection("farcaster");
                  },
                },
              ]}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default SearchInterface;
