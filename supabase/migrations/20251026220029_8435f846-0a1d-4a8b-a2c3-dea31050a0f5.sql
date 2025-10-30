-- Update minted_domains table to use months instead of years and add grace period tracking
ALTER TABLE minted_domains 
  RENAME COLUMN registration_years TO registration_months;

-- Add grace period end date column
ALTER TABLE minted_domains 
  ADD COLUMN grace_period_end TIMESTAMP WITH TIME ZONE;

-- Add is_expired flag for soft deletion tracking
ALTER TABLE minted_domains 
  ADD COLUMN is_expired BOOLEAN DEFAULT false NOT NULL;

-- Update existing records to calculate grace_period_end (expiry_date + 1 month)
UPDATE minted_domains 
SET grace_period_end = expiry_date + INTERVAL '1 month'
WHERE grace_period_end IS NULL;

-- Update existing records: convert registration_years (assumed to be years) to months
-- Multiply by 12 to convert years to months
UPDATE minted_domains 
SET registration_months = registration_months * 12
WHERE registration_months <= 10; -- Only convert if looks like years (≤10)

-- Add comment to document the schema
COMMENT ON COLUMN minted_domains.registration_months IS 'Number of months the subdomain is registered for';
COMMENT ON COLUMN minted_domains.grace_period_end IS 'End of grace period (expiry_date + 1 month), after which domain is auto-deleted';
COMMENT ON COLUMN minted_domains.is_expired IS 'Flag indicating if domain has been marked as expired and deleted';