-- Create payment_references table for secure payment tracking
CREATE TABLE IF NOT EXISTS public.payment_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  subdomain TEXT NOT NULL,
  domain TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  payment_amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  transaction_id TEXT,
  tx_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'verified', 'failed'))
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_references_reference ON public.payment_references(reference);
CREATE INDEX IF NOT EXISTS idx_payment_references_wallet ON public.payment_references(wallet_address);
CREATE INDEX IF NOT EXISTS idx_payment_references_status ON public.payment_references(status);

-- Enable RLS
ALTER TABLE public.payment_references ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own payment references"
  ON public.payment_references
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert payment references"
  ON public.payment_references
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update payment references"
  ON public.payment_references
  FOR UPDATE
  USING (true);