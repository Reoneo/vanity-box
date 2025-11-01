-- Add DELETE policies for critical tables to enable proper data lifecycle management

-- 1. Add DELETE policy for minted_domains (wallet-scoped)
-- Users can delete domains they own
CREATE POLICY "Users can delete own domains"
ON public.minted_domains
FOR DELETE
USING (true); -- Currently no auth, so allow all. TODO: Add wallet verification when auth is implemented

-- 2. Add DELETE policy for payment_references (time-based cleanup)
-- Allow cleanup of old verified or failed payments after 90 days
CREATE POLICY "Cleanup old payments"
ON public.payment_references
FOR DELETE
USING (created_at < now() - interval '90 days' AND status IN ('verified', 'failed'));

-- 3. Add UPDATE policy for minted_domains
-- Users should be able to update their own domain records
CREATE POLICY "Users can update own domains"
ON public.minted_domains
FOR UPDATE
USING (true) -- Currently no auth, so allow all. TODO: Add wallet verification when auth is implemented
WITH CHECK (true);
