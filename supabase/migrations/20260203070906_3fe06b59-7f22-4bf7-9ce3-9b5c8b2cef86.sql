-- Add DELETE policy for profiles (only admins can delete profiles)
CREATE POLICY "Only admins can delete profiles"
ON public.profiles FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Add UPDATE policy for registrations (users can update their own pending registrations)
CREATE POLICY "Users can update their own pending registrations"
ON public.registrations FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

-- Add DELETE policy for registrations (users can delete their own pending registrations)
CREATE POLICY "Users can delete their own pending registrations"
ON public.registrations FOR DELETE
USING (auth.uid() = user_id AND status = 'pending');