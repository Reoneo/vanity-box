-- Add $mith.eth domain configuration
INSERT INTO domain_configs (domain_name, api_key_secret_name, status, display_name, description)
VALUES ('$mith.eth', 'NAMESTONE_API_KEY', 'active', '$mith.eth', 'Personal ENS domain')
ON CONFLICT (domain_name) 
DO UPDATE SET 
  status = 'active',
  api_key_secret_name = 'NAMESTONE_API_KEY',
  updated_at = NOW();