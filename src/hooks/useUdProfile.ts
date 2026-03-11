import { useState, useEffect } from "react";
import { callEdge } from "@/lib/supaInvoke";

export interface UdProfile {
  displayName?: string;
  description?: string;
  imagePath?: string;
  imageType?: string;
  coverPath?: string;
  location?: string;
  web2Url?: string;
}

export interface UdSocialAccounts {
  twitter?: { location: string };
  discord?: { location: string };
  telegram?: { location: string };
  reddit?: { location: string };
  youtube?: { location: string };
  github?: { location: string };
  linkedin?: { location: string };
  [key: string]: { location: string } | undefined;
}

export interface UdNftItem {
  name?: string;
  description?: string;
  image_url?: string;
  collection?: string;
  link?: string;
}

export interface UdProfileData {
  profile: UdProfile | null;
  socialAccounts: UdSocialAccounts | null;
  social: { followerCount?: number; followingCount?: number } | null;
  nfts: UdNftItem[];
  domainInfo: any;
  loading: boolean;
  error: string | null;
}

export function useUdProfile(domain: string | null): UdProfileData {
  const [data, setData] = useState<UdProfileData>({
    profile: null,
    socialAccounts: null,
    social: null,
    nfts: [],
    domainInfo: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!domain) return;

    let cancelled = false;
    setData((d) => ({ ...d, loading: true, error: null }));

    callEdge("get-ud-profile", { domain })
      .then((res) => {
        if (cancelled) return;

        const profile = res?.profile?.profile ?? null;
        const socialAccounts = res?.profile?.socialAccounts ?? null;
        const social = res?.profile?.social ?? null;

        // Parse NFTs from the nested response structure
        let nfts: UdNftItem[] = [];
        if (res?.nfts) {
          // UD returns { items: [...] } or nested by address
          const raw = res.nfts;
          if (Array.isArray(raw?.items)) {
            nfts = raw.items;
          } else if (raw?.data) {
            // Iterate addresses
            for (const addr of Object.values(raw.data) as any[]) {
              if (addr?.nfts && Array.isArray(addr.nfts)) {
                nfts.push(...addr.nfts);
              }
            }
          }
        }

        setData({
          profile,
          socialAccounts,
          social,
          nfts,
          domainInfo: res?.domainInfo ?? null,
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setData((d) => ({
          ...d,
          loading: false,
          error: err?.message || "Failed to fetch UD profile",
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [domain]);

  return data;
}
