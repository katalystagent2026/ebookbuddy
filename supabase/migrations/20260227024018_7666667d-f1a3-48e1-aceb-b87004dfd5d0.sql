
CREATE TABLE public.zoom_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id text NOT NULL DEFAULT '',
  passcode text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.zoom_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage zoom config"
ON public.zoom_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view zoom config"
ON public.zoom_config
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Insert default config
INSERT INTO public.zoom_config (meeting_id, passcode)
VALUES ('885 0722 0856', '475217');
