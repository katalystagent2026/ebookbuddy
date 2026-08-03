ALTER TABLE public.zoom_accounts
  ADD COLUMN IF NOT EXISTS video_provider text NOT NULL DEFAULT 'zoom',
  ADD COLUMN IF NOT EXISTS jitsi_room_name text NOT NULL DEFAULT '';

ALTER TABLE public.zoom_accounts
  ADD CONSTRAINT zoom_accounts_video_provider_check
  CHECK (video_provider IN ('zoom', 'jitsi'));