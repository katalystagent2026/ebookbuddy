ALTER TABLE public.words ADD COLUMN IF NOT EXISTS word_code text, ADD COLUMN IF NOT EXISTS image_url text;
CREATE POLICY "Signed-in users can view word media" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'word-media');
CREATE POLICY "Admins can upload word media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'word-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update word media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'word-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete word media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'word-media' AND public.has_role(auth.uid(), 'admin'));