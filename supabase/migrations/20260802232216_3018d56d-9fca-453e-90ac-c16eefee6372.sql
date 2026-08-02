CREATE TABLE public.api_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT '',
  key_value text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_credentials TO authenticated;
GRANT ALL ON public.api_credentials TO service_role;

ALTER TABLE public.api_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage api credentials"
ON public.api_credentials FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_api_credentials_updated_at
BEFORE UPDATE ON public.api_credentials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();