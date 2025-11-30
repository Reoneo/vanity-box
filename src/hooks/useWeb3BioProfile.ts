import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SimpleProfile = {
  address: string;
  identity: string;
  platform: string;
  displayName: string | null;
  avatar: string | null;
  description: string | null;
  email: string | null;
  header: string | null;
  website: string | null;
  url: string | null;
  links: { key: string; link: string; handle: string }[];
  followerCount: number | null;
  followingCount: number | null;
};

export function useWeb3BioProfile() {
  const [profile, setProfile] = useState<SimpleProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const lookup = useCallback(async (identity: string) => {
    const trimmed = identity.trim();
    if (!trimmed) return;

    setLoading(true);
    setErrorMsg(null);
    setProfile(null);

    const { data, error } = await supabase.functions.invoke("web3bio-profile", {
      body: { identity: trimmed },
    });

    if (error) {
      console.error("❌ web3bio-profile edge error:", error);
      setErrorMsg("Profile lookup failed. Please try again.");
      setLoading(false);
      return;
    }

    if (!data) {
      setErrorMsg("No response from server.");
      setLoading(false);
      return;
    }

    if (data.error) {
      console.error("❌ web3bio-profile API error:", data);
      setErrorMsg(data.details || data.error || "Profile lookup failed.");
      setLoading(false);
      return;
    }

    if (data.notFound || !data.profile) {
      setErrorMsg("No profile found for that identity.");
      setLoading(false);
      return;
    }

    setProfile(data.profile as SimpleProfile);
    setLoading(false);
  }, []);

  return { profile, loading, errorMsg, lookup };
}
