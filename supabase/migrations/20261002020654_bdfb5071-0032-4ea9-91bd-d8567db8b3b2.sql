CREATE TABLE public.words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL,
  part_of_speech text NOT NULL DEFAULT '',
  definition text NOT NULL DEFAULT '',
  simple_definition text NOT NULL DEFAULT '',
  ipa text NOT NULL DEFAULT '',
  syllables jsonb NOT NULL DEFAULT '[]'::jsonb,
  example_sentence text NOT NULL DEFAULT '',
  audio_url text,
  sentence_audio_url text,
  source text NOT NULL DEFAULT 'dictionaryapi.dev',
  needs_review boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX words_word_key ON public.words (lower(word));
GRANT SELECT ON public.words TO authenticated;
GRANT ALL ON public.words TO service_role;
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can read words" ON public.words FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage words" ON public.words FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_words_updated_at BEFORE UPDATE ON public.words FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  word_id uuid NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  box integer NOT NULL DEFAULT 1,
  next_review date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, word_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_words TO authenticated;
GRANT ALL ON public.user_words TO service_role;
ALTER TABLE public.user_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own words" ON public.user_words FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);