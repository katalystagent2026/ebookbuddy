import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Monitor, Smartphone, SpellCheck, Sparkles, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import RichTextEditor, { type FieldMenuGroup } from './RichTextEditor';
import {
  ANSWER_FIELD_TYPES, DEFAULT_EMAILS, EMAIL_FIELDS, EMAIL_LAYOUTS, EMAIL_PURPOSES, FIELD_GROUPS, fillFields,
  formFieldKey, renderEmail,
  type EmailLanguage, type EmailLayout, type EmailPurpose,
} from '../../../../supabase/functions/_shared/email';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  layout: string;
  purpose: string | null;
  language: string;
  updated_at: string;
}

type Draft = Omit<EmailTemplate, 'id' | 'updated_at'>;

const NOT_USED = 'none';
const BUILT_IN_SAMPLES = Object.fromEntries(Object.entries(EMAIL_FIELDS).map(([k, f]) => [k, f.sample]));

/** A custom form from Settings → Forms/Link, with its answer fields in form order. */
interface CustomForm {
  key: string;
  label: string;
  fields: { key: string; label: string }[];
}

/** Loads custom forms (including /volunteer) so their fields can be inserted. */
const useCustomForms = () => {
  const [forms, setForms] = useState<CustomForm[]>([]);
  useEffect(() => {
    supabase
      .from('forms')
      .select('id, name, slug, fields, created_at')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setForms(
          (data ?? []).map((f) => {
            const formKey = f.slug || f.id;
            const fields = (Array.isArray(f.fields) ? f.fields : []) as { name?: string; label?: string; type?: string }[];
            return {
              key: formKey,
              label: `${f.name}${f.slug ? ` (/${f.slug})` : ''}`,
              fields: fields
                .filter((x) => x?.name && ANSWER_FIELD_TYPES.includes(String(x.type)))
                .map((x) => ({ key: formFieldKey(formKey, String(x.name)), label: String(x.label || x.name) })),
            };
          }),
        );
      });
  }, []);
  return forms;
};

/** Sandboxed preview: the email's HTML can't run scripts or touch the admin page. */
const EmailPreview = ({ html, width }: { html: string; width: 'desktop' | 'phone' }) => (
  <div className="flex justify-center rounded-lg border bg-muted/40 p-3">
    <iframe
      title="Email preview"
      sandbox=""
      srcDoc={html}
      className={cn('h-[560px] rounded-md border bg-white transition-all', width === 'phone' ? 'w-[375px]' : 'w-full')}
    />
  </div>
);

interface AiSuggestion {
  subject: string;
  html: string;
  notes: string[];
}

export default function EmailEditor({
  template, onDone,
}: { template: EmailTemplate | null; onDone: (saved: boolean) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [draft, setDraft] = useState<Draft>(() => ({
    name: template?.name ?? '',
    subject: template?.subject ?? '',
    body_html: template?.body_html ?? '',
    layout: template?.layout ?? 'classic',
    purpose: template?.purpose ?? null,
    language: template?.language ?? 'en',
  }));
  const [saving, setSaving] = useState(false);
  const [previewWidth, setPreviewWidth] = useState<'desktop' | 'phone'>('desktop');
  const [aiBusy, setAiBusy] = useState<'grammar' | 'professional' | null>(null);
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);

  const purposeInfo = EMAIL_PURPOSES.find((p) => p.id === draft.purpose);
  const customForms = useCustomForms();

  // Built-in groups first (greyed out when this email can't fill them), then one group per custom form.
  const fieldGroups: FieldMenuGroup[] = useMemo(
    () => [
      ...FIELD_GROUPS.map((g) => ({
        id: g.id,
        label: g.label,
        fields: g.fields,
        disabledReason:
          purposeInfo && !purposeInfo.groups.includes(g.id)
            ? `Not available in "${purposeInfo.label}": this email isn't about a ${g.id === 'student' ? 'student registration' : 'volunteer account'}.`
            : undefined,
      })),
      ...customForms.map((f) => ({ id: `form:${f.key}`, label: `Form: ${f.label}`, fields: f.fields })),
    ],
    [purposeInfo, customForms],
  );

  // Preview samples: built-in fields get example values, form fields show their label.
  const SAMPLE_VALUES = useMemo(
    () => ({
      ...Object.fromEntries(customForms.flatMap((f) => f.fields.map((x) => [x.key, `[${x.label}]`]))),
      ...BUILT_IN_SAMPLES,
    }),
    [customForms],
  );
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const preview = useMemo(
    () => renderEmail(draft.layout as EmailLayout, fillFields(draft.body_html || '<p></p>', SAMPLE_VALUES), draft.language as EmailLanguage),
    [draft.layout, draft.body_html, draft.language, SAMPLE_VALUES],
  );

  const builtIn = draft.purpose
    ? DEFAULT_EMAILS[draft.purpose as EmailPurpose][draft.language as EmailLanguage] ?? DEFAULT_EMAILS[draft.purpose as EmailPurpose].en
    : null;

  const runAi = async (action: 'grammar' | 'professional') => {
    if (!draft.body_html.trim()) {
      toast({ title: 'Write some content first' });
      return;
    }
    setAiBusy(action);
    try {
      const { data, error } = await supabase.functions.invoke('email-ai-assist', {
        body: { action, subject: draft.subject, html: draft.body_html },
      });
      if (error) {
        let message = '';
        try {
          message = (await (error as { context?: Response }).context?.json())?.error || '';
        } catch {
          // response body was not JSON
        }
        throw new Error(message || 'The AI request failed.');
      }
      setSuggestion({ subject: String(data.subject ?? draft.subject), html: String(data.html ?? ''), notes: data.notes ?? [] });
    } catch (err) {
      toast({ title: 'AI check failed', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    } finally {
      setAiBusy(null);
    }
  };

  const save = async () => {
    if (!draft.name.trim()) return toast({ title: 'Please give the email a name', variant: 'destructive' });
    if (!draft.subject.trim()) return toast({ title: 'Please add a subject line', variant: 'destructive' });
    if (!draft.body_html.trim()) return toast({ title: 'Please write the email body', variant: 'destructive' });

    setSaving(true);
    const payload = {
      ...draft,
      name: draft.name.trim(),
      subject: draft.subject.trim(),
      // Volunteer and admin emails are always sent in English.
      language: purposeInfo?.englishOnly ? 'en' : draft.language,
      updated_by: user?.id ?? null,
    };
    const { error } = template
      ? await supabase.from('email_templates').update(payload).eq('id', template.id)
      : await supabase.from('email_templates').insert(payload);
    setSaving(false);

    if (error) {
      const duplicate = error.code === '23505';
      toast({
        title: duplicate ? 'Already in use' : 'Error saving email',
        description: duplicate
          ? 'Another saved email is already used for this purpose and language. Change that one, or set it to "Not used" first.'
          : error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: template ? 'Email updated' : 'Email created' });
    onDone(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => onDone(false)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to emails
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {template ? 'Save changes' : 'Create email'}
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{template ? 'Edit email' : 'New email'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-name">Name</Label>
                <Input id="email-name" value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Welcome email for approved families" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Used for</Label>
                  <Select
                    value={draft.purpose ?? NOT_USED}
                    onValueChange={(v) => set({ purpose: v === NOT_USED ? null : v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NOT_USED}>Not used (draft)</SelectItem>
                      {EMAIL_PURPOSES.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select
                    value={purposeInfo?.englishOnly ? 'en' : draft.language}
                    onValueChange={(v) => set({ language: v })}
                    disabled={purposeInfo?.englishOnly}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                    </SelectContent>
                  </Select>
                  {purposeInfo?.englishOnly && (
                    <p className="text-xs text-muted-foreground">This email is always sent in English.</p>
                  )}
                </div>
              </div>
              {builtIn && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/50 p-3 text-sm">
                  <span className="text-muted-foreground">Start from the wording this email uses today.</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => set({ subject: builtIn.subject, body_html: builtIn.body })}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Start from current wording
                  </Button>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email-subject">Subject line</Label>
                <Input id="email-subject" value={draft.subject} onChange={(e) => set({ subject: e.target.value })} placeholder="We received your eBookBuddy registration" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
              <CardTitle>Email body</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" disabled={!!aiBusy} onClick={() => runAi('grammar')}>
                  {aiBusy === 'grammar' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SpellCheck className="mr-2 h-4 w-4" />}
                  Fix grammar
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={!!aiBusy} onClick={() => runAi('professional')}>
                  {aiBusy === 'professional' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Make professional
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <RichTextEditor value={draft.body_html} onChange={(html) => set({ body_html: html })} fieldGroups={fieldGroups} />
              <p className="text-xs text-muted-foreground">
                Images in emails can be seen by anyone with the link. Please don't upload photos of children or
                anything private. Fields like <code>{'{{guardian_name}}'}</code> are filled in when the email is sent;
                a field with no answer is left blank.
              </p>
              {draft.purpose === 'admin_new_registration' && (
                <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  This notice goes to info@ebookbuddy.org. Only add a child's details (name, school, grade) if your team
                  really needs them in the inbox; they're always available in Admin → Registrations.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Layout</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Email layout">
                {EMAIL_LAYOUTS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    role="radio"
                    aria-checked={draft.layout === l.id}
                    onClick={() => set({ layout: l.id })}
                    className={cn(
                      'rounded-lg border p-3 text-left transition-colors hover:bg-muted/50',
                      draft.layout === l.id && 'border-primary ring-2 ring-primary/30',
                    )}
                  >
                    <div className="font-medium">{l.label}</div>
                    <div className="text-xs text-muted-foreground">{l.description}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
              <div>
                <CardTitle>Preview</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Subject: <span className="font-medium text-foreground">{fillFields(draft.subject, SAMPLE_VALUES, true) || '—'}</span>
                </p>
              </div>
              <ToggleGroup
                type="single"
                value={previewWidth}
                onValueChange={(v) => v && setPreviewWidth(v as 'desktop' | 'phone')}
                aria-label="Preview width"
              >
                <ToggleGroupItem value="desktop" aria-label="Desktop width"><Monitor className="h-4 w-4" /></ToggleGroupItem>
                <ToggleGroupItem value="phone" aria-label="Phone width"><Smartphone className="h-4 w-4" /></ToggleGroupItem>
              </ToggleGroup>
            </CardHeader>
            <CardContent>
              <EmailPreview html={preview} width={previewWidth} />
              <p className="mt-2 text-xs text-muted-foreground">The preview fills in fields with sample names.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!suggestion} onOpenChange={(open) => !open && setSuggestion(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>AI suggestion</DialogTitle>
            <DialogDescription>Review the suggested version. Nothing changes unless you accept it.</DialogDescription>
          </DialogHeader>
          {suggestion && (
            <div className="space-y-3">
              {suggestion.notes.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {suggestion.notes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              )}
              <p className="text-sm">
                Subject: <span className="font-medium">{suggestion.subject}</span>
              </p>
              <iframe
                title="AI suggestion preview"
                sandbox=""
                srcDoc={renderEmail(draft.layout as EmailLayout, fillFields(suggestion.html, SAMPLE_VALUES), draft.language as EmailLanguage)}
                className="h-[420px] w-full rounded-md border bg-white"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuggestion(null)}>Discard</Button>
            <Button
              onClick={() => {
                if (suggestion) set({ subject: suggestion.subject, body_html: suggestion.html });
                setSuggestion(null);
              }}
            >
              Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
