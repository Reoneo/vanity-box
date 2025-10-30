-- Create table to track minted domains and registration dates
CREATE TABLE IF NOT EXISTS public.minted_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  subdomain TEXT NOT NULL,
  domain TEXT NOT NULL,
  full_name TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  registration_years INTEGER NOT NULL DEFAULT 1,
  registration_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
  tx_hash TEXT,
  payment_method TEXT,
  payment_amount NUMERIC(20, 8),
  network_fee NUMERIC(20, 8),
  UNIQUE(full_name, wallet_address)
);

-- Enable Row Level Security
ALTER TABLE public.minted_domains ENABLE ROW LEVEL SECURITY;

-- Create policies for minted_domains table
CREATE POLICY "Minted domains are viewable by everyone"
  ON public.minted_domains
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert minted domains"
  ON public.minted_domains
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_minted_domains_wallet ON public.minted_domains(wallet_address);
CREATE INDEX IF NOT EXISTS idx_minted_domains_full_name ON public.minted_domains(full_name);
CREATE INDEX IF NOT EXISTS idx_minted_domains_expiry ON public.minted_domains(expiry_date);

-- Add trigger for updated_at
CREATE TRIGGER update_minted_domains_updated_at
  BEFORE UPDATE ON public.minted_domains
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();