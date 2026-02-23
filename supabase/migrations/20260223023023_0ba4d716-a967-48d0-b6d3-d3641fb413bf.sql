
-- Table to persist .iota → linked EVM address records
CREATE TABLE public.iota_wallet_links (
  iota_name text PRIMARY KEY,
  holder_did text NOT NULL,
  chain text NOT NULL DEFAULT 'ethereum',
  evm_address text NOT NULL,
  vc_jwt text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index on evm_address for reverse lookups
CREATE INDEX idx_iota_wallet_links_evm_address ON public.iota_wallet_links(evm_address);

-- Enable RLS
ALTER TABLE public.iota_wallet_links ENABLE ROW LEVEL SECURITY;

-- Public SELECT so any viewer can resolve the linked wallet
CREATE POLICY "Anyone can view iota wallet links"
  ON public.iota_wallet_links
  FOR SELECT
  USING (true);

-- Only service_role can write
CREATE POLICY "Service role can insert iota wallet links"
  ON public.iota_wallet_links
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update iota wallet links"
  ON public.iota_wallet_links
  FOR UPDATE
  USING (true);

CREATE POLICY "Service role can delete iota wallet links"
  ON public.iota_wallet_links
  FOR DELETE
  USING (true);

-- Updated_at trigger
CREATE TRIGGER update_iota_wallet_links_updated_at
  BEFORE UPDATE ON public.iota_wallet_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
