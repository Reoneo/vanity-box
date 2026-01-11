-- Fix overly permissive RLS policies for minted_domains and payment_references

-- Drop existing permissive INSERT policies
DROP POLICY IF EXISTS "Anyone can insert minted domains" ON public.minted_domains;
DROP POLICY IF EXISTS "Anyone can insert payment references" ON public.payment_references;
DROP POLICY IF EXISTS "System can update payment references" ON public.payment_references;

-- Create service-role-only policies for minted_domains
-- Only the service role (used by edge functions) can insert/update/delete
CREATE POLICY "Service role can insert minted domains"
  ON public.minted_domains FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update minted domains"
  ON public.minted_domains FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Service role can delete minted domains"
  ON public.minted_domains FOR DELETE
  TO service_role
  USING (true);

-- Create service-role-only policies for payment_references
CREATE POLICY "Service role can insert payment references"
  ON public.payment_references FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update payment references"
  ON public.payment_references FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Service role can delete payment references"
  ON public.payment_references FOR DELETE
  TO service_role
  USING (true);

-- Keep public read access for transparency (users can view their domains/payments)
-- These should already exist but ensure they're correct
DROP POLICY IF EXISTS "Anyone can view minted domains" ON public.minted_domains;
DROP POLICY IF EXISTS "Anyone can view payment references" ON public.payment_references;

CREATE POLICY "Anyone can view minted domains"
  ON public.minted_domains FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view payment references"
  ON public.payment_references FOR SELECT
  USING (true);