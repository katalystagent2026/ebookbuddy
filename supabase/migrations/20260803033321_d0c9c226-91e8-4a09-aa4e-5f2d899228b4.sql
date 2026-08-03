CREATE POLICY "Authenticated users can view meeting setup status"
ON public.zoom_accounts
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

GRANT SELECT (id, name, is_active, video_provider) ON public.zoom_accounts TO authenticated;