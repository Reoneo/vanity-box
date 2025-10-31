-- Update the API key for $mith.eth domain to use the dedicated key
UPDATE domain_configs
SET api_key_secret_name = 'NAMESTONE_API_KEY_MITH'
WHERE domain_name = '$mith.eth';