CREATE OR REPLACE FUNCTION public.can_join_active_meeting(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.zoom_accounts z ON z.id = p.zoom_account_id
    WHERE p.user_id = _user_id
      AND p.is_verified = true
      AND z.is_active = true
      AND public.has_role(_user_id, 'volunteer'::app_role)
  )
$$;

REVOKE ALL ON FUNCTION public.can_join_active_meeting(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_join_active_meeting(uuid) TO authenticated, service_role;