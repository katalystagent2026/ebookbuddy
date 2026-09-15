ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS public_title text,
  ADD COLUMN IF NOT EXISTS public_description text,
  ADD COLUMN IF NOT EXISTS submit_label text;

CREATE UNIQUE INDEX IF NOT EXISTS forms_slug_key ON public.forms (lower(slug)) WHERE slug IS NOT NULL;

GRANT SELECT ON public.forms TO anon;

DROP POLICY IF EXISTS "Anyone can view published forms" ON public.forms;
CREATE POLICY "Anyone can view published forms"
ON public.forms FOR SELECT
TO anon, authenticated
USING (is_published = true AND slug IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.form_submissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_submissions TO authenticated;
GRANT ALL ON public.form_submissions TO service_role;

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit to a published form"
ON public.form_submissions FOR INSERT
TO anon, authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_id AND f.is_published = true AND f.slug IS NOT NULL));

CREATE POLICY "Admins can view submissions"
ON public.form_submissions FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update submissions"
ON public.form_submissions FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete submissions"
ON public.form_submissions FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_form_submissions_updated_at
BEFORE UPDATE ON public.form_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();