
-- Drop the overly broad policy and replace with service-role-only policies
DROP POLICY "Service role can manage notarizations" ON public.profile_notarizations;

-- Service role insert
CREATE POLICY "Service role can insert notarizations"
ON public.profile_notarizations
FOR INSERT
WITH CHECK (true);

-- Service role update
CREATE POLICY "Service role can update notarizations"
ON public.profile_notarizations
FOR UPDATE
USING (true)
WITH CHECK (true);
