-- Fix search_path for the trigger function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_domain_configs_updated_at
BEFORE UPDATE ON public.domain_configs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();