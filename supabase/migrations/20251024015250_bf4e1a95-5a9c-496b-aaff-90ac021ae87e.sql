-- Create table for domain configurations
CREATE TABLE IF NOT EXISTS public.domain_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_name TEXT NOT NULL UNIQUE,
  api_key_secret_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  display_name TEXT,
  description TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.domain_configs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read domain configs (they need to see available domains)
CREATE POLICY "Domain configs are viewable by everyone"
ON public.domain_configs
FOR SELECT
USING (true);

-- Insert the four domains
INSERT INTO public.domain_configs (domain_name, api_key_secret_name, status, display_name, description) VALUES
('smith.cash', 'NAMESTONE_API_KEY', 'active', 'smith.cash', 'Premium Web3 identity'),
('30315.eth', 'NAMESTONE_API_KEY_30315', 'active', '30315.eth', 'Exclusive ENS domain'),
('teamxrp.eth', 'NAMESTONE_API_KEY_TEAMXRP', 'active', 'TeamXRP.eth', 'XRP community domain'),
('termux.eth', 'NAMESTONE_API_KEY_TERMUX', 'active', 'Termux.eth', 'Developer domain')
ON CONFLICT (domain_name) DO NOTHING;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_domain_configs_updated_at
BEFORE UPDATE ON public.domain_configs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();