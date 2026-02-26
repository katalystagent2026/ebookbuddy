
-- Allow anyone (including non-authenticated users) to submit student registrations
CREATE POLICY "Anyone can submit registrations"
ON public.registrations
FOR INSERT
WITH CHECK (registration_type = 'student' AND user_id IS NULL);
