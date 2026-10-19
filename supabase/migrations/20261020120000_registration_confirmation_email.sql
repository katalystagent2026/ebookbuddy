-- The send-email function sets this when it emails the guardian a "registration
-- received" confirmation, so the public form can't trigger repeat emails.
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS confirmation_emailed_at timestamptz;
