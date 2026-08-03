CREATE OR REPLACE FUNCTION public.get_meeting_setups()
RETURNS TABLE (id uuid, name text, is_active boolean, video_provider text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT z.id, z.name, z.is_active, z.video_provider
  FROM public.zoom_accounts z
  WHERE auth.uid() IS NOT NULL
$$;

REVOKE ALL ON FUNCTION public.get_meeting_setups() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_meeting_setups() TO authenticated;