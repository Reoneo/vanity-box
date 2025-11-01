-- Fix overly permissive RLS policies for minted_domains and payment_references tables
-- These policies currently allow unrestricted access which is a critical security vulnerability

-- =============================================
-- 1. Fix minted_domains RLS policies
-- =============================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can insert minted domains" ON public.minted_domains;
DROP POLICY IF EXISTS "Users can update own domains" ON public.minted_domains;
DROP POLICY IF EXISTS "Users can delete own domains" ON public.minted_domains;

-- Create new restrictive policy: Only service role can insert (via edge functions)
CREATE POLICY "Only service role can insert domains"
ON public.minted_domains
FOR INSERT
TO service_role
WITH CHECK (true);

-- Users can view their own domains only
CREATE POLICY "Users can view own domains"
ON public.minted_domains
FOR SELECT
TO authenticated, anon
USING (true); -- Allow viewing all domains (public read for display purposes)

-- Only service role can update
CREATE POLICY "Only service role can update domains"
ON public.minted_domains
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Only service role can delete
CREATE POLICY "Only service role can delete domains"
ON public.minted_domains
FOR DELETE
TO service_role
USING (true);

-- =============================================
-- 2. Fix payment_references RLS policies
-- =============================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can insert payment references" ON public.payment_references;
DROP POLICY IF EXISTS "System can update payment references" ON public.payment_references;
DROP POLICY IF EXISTS "Users can view their own payment references" ON public.payment_references;

-- Only service role can insert (via edge functions)
CREATE POLICY "Only service role can insert payment references"
ON public.payment_references
FOR INSERT
TO service_role
WITH CHECK (true);

-- Only service role can view
CREATE POLICY "Only service role can view payment references"
ON public.payment_references
FOR SELECT
TO service_role
USING (true);

-- Only service role can update
CREATE POLICY "Only service role can update payment references"
ON public.payment_references
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Cleanup policy remains but restricted to service role
DROP POLICY IF EXISTS "Cleanup old payments" ON public.payment_references;
CREATE POLICY "Service role can cleanup old payments"
ON public.payment_references
FOR DELETE
TO service_role
USING ((created_at < (now() - '90 days'::interval)) AND (status = ANY (ARRAY['verified'::text, 'failed'::text])));