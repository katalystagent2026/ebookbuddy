## Goal
Give the account **treobruce@gmail.com** admin access so it can use `/admin`.

## Change
One data update in the roles table:
- Add an `admin` role entry for the user whose profile email is `treobruce@gmail.com`.
- Keep the existing `user` role (harmless) — admin checks look for the admin entry.
- Use a safe insert that does nothing if the admin role already exists.

## Technical detail
```sql
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::app_role FROM public.profiles
WHERE email = 'treobruce@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
```
No schema or code changes needed; `/admin` already gates on `has_role(auth.uid(), 'admin')`.

## Verification
Query the roles joined to profiles to confirm both admins are listed. The user should sign out and back in so the new role loads.
