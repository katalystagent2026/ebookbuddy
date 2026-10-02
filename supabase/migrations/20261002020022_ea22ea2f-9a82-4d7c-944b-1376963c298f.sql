CREATE TABLE public.vocab_words (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word text NOT NULL,
  definition text NOT NULL DEFAULT '',
  example text NOT NULL DEFAULT '',
  reading_level text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vocab_words TO authenticated;
GRANT ALL ON public.vocab_words TO service_role;
ALTER TABLE public.vocab_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage vocab words" ON public.vocab_words FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_vocab_words_updated_at BEFORE UPDATE ON public.vocab_words FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();