CREATE TABLE IF NOT EXISTS public.iota_cross_chain_profiles (
  iota_name      text PRIMARY KEY,
  owner_address  text,
  evm_address    text,
  ton_address    text,
  apt_address    text,
  sui_address    text,
  ipfs_cid       text,
  display_name   text,
  avatar_url     text,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iota_cross_chain_evm
  ON public.iota_cross_chain_profiles (lower(evm_address));

ALTER TABLE public.iota_cross_chain_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view cross chain profiles" ON public.iota_cross_chain_profiles;
CREATE POLICY "Anyone can view cross chain profiles"
  ON public.iota_cross_chain_profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role manages cross chain profiles" ON public.iota_cross_chain_profiles;
CREATE POLICY "Service role manages cross chain profiles"
  ON public.iota_cross_chain_profiles FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.sync_iota_cross_chain_from_links()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_evm text;
  v_ton text;
  v_apt text;
  v_sui text;
BEGIN
  IF lower(NEW.chain) = 'ethereum' THEN v_evm := lower(NEW.evm_address); END IF;
  IF lower(NEW.chain) = 'ton'      THEN v_ton := NEW.evm_address; END IF;
  IF lower(NEW.chain) = 'aptos'    THEN v_apt := NEW.evm_address; END IF;
  IF lower(NEW.chain) = 'sui'      THEN v_sui := NEW.evm_address; END IF;

  INSERT INTO public.iota_cross_chain_profiles (iota_name, evm_address, ton_address, apt_address, sui_address, updated_at)
  VALUES (lower(NEW.iota_name), v_evm, v_ton, v_apt, v_sui, now())
  ON CONFLICT (iota_name) DO UPDATE
  SET evm_address = COALESCE(EXCLUDED.evm_address, public.iota_cross_chain_profiles.evm_address),
      ton_address = COALESCE(EXCLUDED.ton_address, public.iota_cross_chain_profiles.ton_address),
      apt_address = COALESCE(EXCLUDED.apt_address, public.iota_cross_chain_profiles.apt_address),
      sui_address = COALESCE(EXCLUDED.sui_address, public.iota_cross_chain_profiles.sui_address),
      updated_at  = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_iota_cross_chain ON public.iota_wallet_links;
CREATE TRIGGER trg_sync_iota_cross_chain
AFTER INSERT OR UPDATE ON public.iota_wallet_links
FOR EACH ROW EXECUTE FUNCTION public.sync_iota_cross_chain_from_links();

INSERT INTO public.iota_cross_chain_profiles (iota_name, evm_address, ton_address, apt_address, sui_address, updated_at)
SELECT
  lower(iota_name),
  MAX(CASE WHEN lower(chain) = 'ethereum' THEN lower(evm_address) END),
  MAX(CASE WHEN lower(chain) = 'ton'      THEN evm_address END),
  MAX(CASE WHEN lower(chain) = 'aptos'    THEN evm_address END),
  MAX(CASE WHEN lower(chain) = 'sui'      THEN evm_address END),
  now()
FROM public.iota_wallet_links
GROUP BY lower(iota_name)
ON CONFLICT (iota_name) DO UPDATE
SET evm_address = COALESCE(EXCLUDED.evm_address, public.iota_cross_chain_profiles.evm_address),
    ton_address = COALESCE(EXCLUDED.ton_address, public.iota_cross_chain_profiles.ton_address),
    apt_address = COALESCE(EXCLUDED.apt_address, public.iota_cross_chain_profiles.apt_address),
    sui_address = COALESCE(EXCLUDED.sui_address, public.iota_cross_chain_profiles.sui_address),
    updated_at  = now();