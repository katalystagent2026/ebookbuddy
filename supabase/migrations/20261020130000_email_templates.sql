-- Admin-editable content for the automatic emails (Admin → Settings → Emails).
-- send-email uses the template whose purpose + language match, else its built-in text.
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  layout text NOT NULL DEFAULT 'classic'
    CHECK (layout IN ('classic', 'banner', 'minimal', 'newsletter')),
  purpose text
    CHECK (purpose IN ('registration_received', 'registration_approved', 'registration_rejected', 'volunteer_verified', 'admin_new_registration')),
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'es')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- At most one template per automatic email and language.
CREATE UNIQUE INDEX IF NOT EXISTS email_templates_purpose_language_key
  ON public.email_templates (purpose, language) WHERE purpose IS NOT NULL;

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;

CREATE POLICY "Admins can manage email templates"
  ON public.email_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Images inside emails. Public read: mail apps load them by URL without signing in.
-- Only admins can add, change or remove them.
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-images', 'email-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can upload email images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'email-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update email images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'email-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete email images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'email-images' AND public.has_role(auth.uid(), 'admin'));
