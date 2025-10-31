-- Seed domain_configs table with all active Namestone domains
INSERT INTO public.domain_configs (domain_name, api_key_secret_name, status, display_name, description)
VALUES 
  ('30315.eth', 'NAMESTONE_API_KEY_30315', 'active', '30315.eth', 'Digits-focused ENS domain'),
  ('teamxrp.eth', 'NAMESTONE_API_KEY_TEAMXRP', 'active', 'TeamXRP.eth', 'Crypto community ENS domain'),
  ('termux.eth', 'NAMESTONE_API_KEY_TERMUX', 'active', 'Termux.eth', 'Developer-focused ENS domain'),
  ('mexipay.eth', 'NAMESTONE_API_KEY_MEXIPAY', 'active', 'MexiPay.eth', 'DeFi payment ENS domain'),
  ('guavapay.eth', 'NAMESTONE_API_KEY_GUAVAPAY', 'active', 'GuavaPay.eth', 'DeFi payment ENS domain'),
  ('spyda.eth', 'NAMESTONE_API_KEY_SPYDA', 'active', 'Spyda.eth', 'Artist ENS domain'),
  ('flirtad.eth', 'NAMESTONE_API_KEY_FLIRTAD', 'active', 'FlirtaD.eth', 'Artist ENS domain'),
  ('smith.cash', 'NAMESTONE_API_KEY', 'active', 'Smith.cash', 'Surname DeFi domain'),
  ('$mith.eth', 'NAMESTONE_API_KEY', 'active', '$mith.eth', 'Surname ENS domain')
ON CONFLICT (domain_name) DO UPDATE 
SET 
  api_key_secret_name = EXCLUDED.api_key_secret_name,
  status = EXCLUDED.status,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  updated_at = now();