-- Create table for Polymarket profile address overrides
-- This allows users to map their wallet to their Polymarket proxy wallet
CREATE TABLE public.polymarket_profile_overrides (
  wallet_address TEXT PRIMARY KEY,
  polymarket_profile_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.polymarket_profile_overrides ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read overrides (public data)
CREATE POLICY "Anyone can view polymarket overrides"
ON public.polymarket_profile_overrides
FOR SELECT
USING (true);

-- Allow anyone to insert/update their own override (no auth required for this use case)
CREATE POLICY "Anyone can insert polymarket overrides"
ON public.polymarket_profile_overrides
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update polymarket overrides"
ON public.polymarket_profile_overrides
FOR UPDATE
USING (true);

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_polymarket_overrides_updated_at
BEFORE UPDATE ON public.polymarket_profile_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();