-- The Lovable workspace doesn't allow public storage buckets, so email-images is
-- private. The email editor gives each uploaded picture a long-lived signed link
-- instead, which needs admins to be able to read the bucket.
UPDATE storage.buckets SET public = false WHERE id = 'email-images';

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
