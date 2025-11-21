-- Create enum for easier role management if needed in future
-- Create table to store Farcaster signers linked to World ID
CREATE TABLE public.farcaster_signers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id_hash TEXT UNIQUE NOT NULL,
  signer_uuid TEXT NOT NULL,
  fid BIGINT NOT NULL,
  public_key TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.farcaster_signers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own signer
CREATE POLICY "Users can view their own signer"
  ON public.farcaster_signers
  FOR SELECT
  USING (true);

-- Policy: Only service role can insert signers
CREATE POLICY "Service role can insert signers"
  ON public.farcaster_signers
  FOR INSERT
  WITH CHECK (true);

-- Policy: Only service role can update signers
CREATE POLICY "Service role can update signers"
  ON public.farcaster_signers
  FOR UPDATE
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_farcaster_signers_updated_at
  BEFORE UPDATE ON public.farcaster_signers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index on world_id_hash for faster lookups
CREATE INDEX idx_farcaster_signers_world_id_hash ON public.farcaster_signers(world_id_hash);
CREATE INDEX idx_farcaster_signers_fid ON public.farcaster_signers(fid);