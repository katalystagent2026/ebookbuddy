DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can view email images'
  ) THEN
    CREATE POLICY "Admins can view email images" ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'email-images' AND public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;