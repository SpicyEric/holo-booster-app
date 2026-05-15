CREATE POLICY "Partners can manage their own discovered stores"
ON public.discovered_stores
FOR ALL
TO authenticated
USING (admin_user_id = auth.uid() AND has_role(auth.uid(), 'partner'::app_role))
WITH CHECK (admin_user_id = auth.uid() AND has_role(auth.uid(), 'partner'::app_role));