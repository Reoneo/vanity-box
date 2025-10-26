-- Create table to store POAP data
CREATE TABLE IF NOT EXISTS public.poap_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  wallet_address text NOT NULL,
  event_id integer NOT NULL,
  token_id text NOT NULL UNIQUE,
  event_name text,
  event_description text,
  event_image_url text,
  event_year integer,
  event_start_date timestamp with time zone,
  event_end_date timestamp with time zone,
  owner text,
  chain text
);

-- Enable RLS
ALTER TABLE public.poap_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing POAPs
CREATE POLICY "POAPs are viewable by everyone"
ON public.poap_tokens
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_poap_tokens_updated_at
BEFORE UPDATE ON public.poap_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_poap_wallet_address ON public.poap_tokens(wallet_address);
CREATE INDEX idx_poap_token_id ON public.poap_tokens(token_id);