CREATE TABLE public.api_credential_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credential_id UUID NOT NULL REFERENCES public.api_credentials(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT '',
  key_value TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_credential_entries TO authenticated;
GRANT ALL ON public.api_credential_entries TO service_role;

ALTER TABLE public.api_credential_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage api credential entries"
ON public.api_credential_entries FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_api_credential_entries_updated_at
BEFORE UPDATE ON public.api_credential_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_api_credential_entries_credential_id ON public.api_credential_entries(credential_id);

INSERT INTO public.api_credential_entries (credential_id, type, key_value)
SELECT id, COALESCE(type, ''), COALESCE(key_value, '')
FROM public.api_credentials
WHERE COALESCE(type, '') <> '' OR COALESCE(key_value, '') <> '';