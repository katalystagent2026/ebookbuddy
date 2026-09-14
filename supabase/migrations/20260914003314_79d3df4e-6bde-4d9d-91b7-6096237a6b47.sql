CREATE TABLE public.meeting_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zoom_account_id uuid REFERENCES public.zoom_accounts(id) ON DELETE SET NULL,
  session_name text NOT NULL DEFAULT '',
  video_provider text NOT NULL DEFAULT 'zoom',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text NOT NULL DEFAULT '',
  user_email text NOT NULL DEFAULT '',
  user_role text NOT NULL DEFAULT 'user',
  entered_at timestamp with time zone NOT NULL DEFAULT now(),
  exited_at timestamp with time zone,
  duration_minutes integer,
  error_log text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_sessions TO authenticated;
GRANT ALL ON public.meeting_sessions TO service_role;

ALTER TABLE public.meeting_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own session records"
ON public.meeting_sessions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own session records"
ON public.meeting_sessions FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own session records"
ON public.meeting_sessions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all session records"
ON public.meeting_sessions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_meeting_sessions_updated_at
BEFORE UPDATE ON public.meeting_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_meeting_sessions_entered_at ON public.meeting_sessions (entered_at DESC);