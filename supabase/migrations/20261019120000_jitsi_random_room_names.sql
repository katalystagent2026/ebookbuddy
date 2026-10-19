-- Self-hosted Jitsi (meet.ebookbuddy.org): room names must be random and
-- unguessable. Replace hand-typed names with "ebb-" + 16 random hex chars.
-- The jitsi-token edge function generates one for any setup still missing it.
UPDATE public.zoom_accounts
SET jitsi_room_name = 'ebb-' || substr(md5(gen_random_uuid()::text || gen_random_uuid()::text), 1, 16)
WHERE jitsi_room_name !~ '^ebb-[a-z0-9]{16}$';
