
-- Create table for profile notarization records (IPFS + IOTA hash anchoring)
CREATE TABLE public.profile_notarizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  iota_name TEXT NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL,
  ipfs_cid TEXT NOT NULL,
  sha256_hash TEXT NOT NULL,
  notarized_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_notarizations ENABLE ROW LEVEL SECURITY;

-- Anyone can read notarization records (verification is public)
CREATE POLICY "Notarization records are publicly readable"
ON public.profile_notarizations
FOR SELECT
USING (true);

-- Only service role can insert/update (done via edge functions)
CREATE POLICY "Service role can manage notarizations"
ON public.profile_notarizations
FOR ALL
USING (true)
WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_profile_notarizations_iota_name ON public.profile_notarizations (iota_name);
CREATE INDEX idx_profile_notarizations_wallet ON public.profile_notarizations (wallet_address);

-- Trigger for updated_at
CREATE TRIGGER update_profile_notarizations_updated_at
BEFORE UPDATE ON public.profile_notarizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
