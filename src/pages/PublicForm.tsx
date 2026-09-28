import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import FormRenderer, { FormDefinition, parseFields } from '@/components/forms/FormRenderer';
import NotFound from '@/pages/NotFound';

export default function PublicForm() {
  const { slug = '' } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [formId, setFormId] = useState<string | null>(null);
  const [definition, setDefinition] = useState<FormDefinition | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('forms')
        .select('id, name, public_title, public_description, submit_label, fields')
        .ilike('slug', slug)
        .eq('is_published', true)
        .maybeSingle();
      if (!active) return;
      if (data) {
        const row = data as Record<string, unknown>;
        setFormId(String(row.id));
        setDefinition({
          title: String(row.public_title || row.name || ''),
          description: row.public_description ? String(row.public_description) : '',
          submitLabel: row.submit_label ? String(row.submit_label) : 'Submit',
          fields: parseFields(row.fields),
        });
      } else {
        const { data: link } = await supabase
          .from('links' as never)
          .select('forward_email')
          .ilike('slug', slug)
          .eq('is_active', true)
          .maybeSingle();
        const target = (link as { forward_email?: string } | null)?.forward_email?.trim();
        if (active && target) {
          window.location.href = /^https?:\/\//i.test(target) || target.startsWith('mailto:')
            ? target
            : target.includes('@') ? `mailto:${target}` : `https://${target}`;
          return;
        }
        setFormId(null);
        setDefinition(null);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [slug]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    if (!formId || !definition) return;
    const missing = definition.fields.find(
      (f) => f.required && (values[f.name] === undefined || values[f.name] === '' || values[f.name] === false),
    );
    if (missing) {
      toast({ title: `${missing.label} is required`, variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from('form_submissions')
      .insert({ form_id: formId, user_id: user?.id ?? null, data: values as never });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Could not submit', description: error.message, variant: 'destructive' });
      return;
    }
    setDone(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!definition) return <NotFound />;

  return (
    <main className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            {done ? (
              <div className="text-center space-y-4 py-6">
                <CheckCircle2 className="w-12 h-12 mx-auto text-primary" />
                <h1 className="text-2xl font-bold">Thank you!</h1>
                <p className="text-sm text-muted-foreground">
                  Your response has been received.
                </p>
                <Button asChild variant="outline">
                  <Link to="/">Back to home</Link>
                </Button>
              </div>
            ) : (
              <FormRenderer
                definition={definition}
                submitting={submitting}
                onSubmit={handleSubmit}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
