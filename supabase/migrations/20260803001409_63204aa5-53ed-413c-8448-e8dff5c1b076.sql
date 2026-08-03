ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS zoom_account_id uuid REFERENCES public.zoom_accounts(id) ON DELETE SET NULL;