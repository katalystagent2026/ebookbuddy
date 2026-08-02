CREATE TABLE public.zoom_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sdk_key text NOT NULL DEFAULT '',
  sdk_secret text NOT NULL DEFAULT '',
  meeting_id text NOT NULL DEFAULT '',
  passcode text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoom_accounts TO authenticated;
GRANT ALL ON public.zoom_accounts TO service_role;

ALTER TABLE public.zoom_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage zoom accounts"
ON public.zoom_accounts FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_zoom_accounts_updated_at
BEFORE UPDATE ON public.zoom_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();