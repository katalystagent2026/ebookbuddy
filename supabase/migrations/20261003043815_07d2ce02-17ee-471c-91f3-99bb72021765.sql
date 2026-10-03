CREATE TABLE public.ipa_sounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  mouth_shape text NOT NULL DEFAULT '',
  examples text[] NOT NULL DEFAULT '{}',
  tip text NOT NULL DEFAULT '',
  audio_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ipa_sounds TO authenticated;
GRANT ALL ON public.ipa_sounds TO service_role;
ALTER TABLE public.ipa_sounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read sounds" ON public.ipa_sounds FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage sounds" ON public.ipa_sounds FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_ipa_sounds_updated_at BEFORE UPDATE ON public.ipa_sounds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.azure_viseme_to_mouth (
  viseme_id integer PRIMARY KEY,
  mouth text NOT NULL,
  description text NOT NULL DEFAULT ''
);
GRANT SELECT ON public.azure_viseme_to_mouth TO authenticated;
GRANT ALL ON public.azure_viseme_to_mouth TO service_role;
ALTER TABLE public.azure_viseme_to_mouth ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read visemes" ON public.azure_viseme_to_mouth FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage visemes" ON public.azure_viseme_to_mouth FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  word_id uuid NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  weak_phonemes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.attempts TO authenticated;
GRANT ALL ON public.attempts TO service_role;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own attempts" ON public.attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add own attempts" ON public.attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own attempts" ON public.attempts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all attempts" ON public.attempts FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));