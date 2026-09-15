import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, Pencil, Trash2, FileText, ExternalLink, Sparkles, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FormRenderer, { FormFieldDef, parseFields } from '@/components/forms/FormRenderer';

interface FormRecord {
  id: string;
  name: string;
  slug: string | null;
  public_url: string | null;
  ai_prompt: string | null;
  database_name: string | null;
  show_popup: boolean;
  is_published: boolean;
  public_title: string | null;
  public_description: string | null;
  submit_label: string | null;
  fields: unknown;
  created_at: string;
}

interface FormState {
  name: string;
  slug: string;
  ai_prompt: string;
  database_name: string;
  show_popup: boolean;
  is_published: boolean;
  public_title: string;
  public_description: string;
  submit_label: string;
  fields: FormFieldDef[];
}

const emptyForm = (): FormState => ({
  name: '',
  slug: '',
  ai_prompt: '',
  database_name: 'form_submissions',
  show_popup: false,
  is_published: true,
  public_title: '',
  public_description: '',
  submit_label: 'Submit',
  fields: [],
});

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 60);

const publicUrlFor = (slug: string) =>
  slug ? `${window.location.origin}/${slug}` : '';

export default function AdminForms() {
  const [items, setItems] = useState<FormRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FormRecord | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FormRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Could not load forms', description: error.message, variant: 'destructive' });
    } else {
      setItems((data ?? []) as unknown as FormRecord[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (item: FormRecord) => {
    setEditing(item);
    setForm({
      name: item.name ?? '',
      slug: item.slug ?? '',
      ai_prompt: item.ai_prompt ?? '',
      database_name: item.database_name ?? 'form_submissions',
      show_popup: item.show_popup,
      is_published: item.is_published ?? true,
      public_title: item.public_title ?? item.name ?? '',
      public_description: item.public_description ?? '',
      submit_label: item.submit_label ?? 'Submit',
      fields: parseFields(item.fields),
    });
    setDialogOpen(true);
  };

  const handleGenerate = async () => {
    const prompt = form.ai_prompt.trim();
    if (!prompt) {
      toast({ title: 'Describe the form or the change you want first', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke('form-ai-update', {
      body: {
        prompt,
        title: form.public_title || form.name,
        description: form.public_description,
        submitLabel: form.submit_label,
        fields: form.fields,
      },
    });
    setGenerating(false);
    if (error) {
      toast({
        title: 'Could not update the form',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    const result = data as { title?: string; description?: string; submitLabel?: string; fields?: unknown };
    setForm((prev) => ({
      ...prev,
      public_title: result.title || prev.public_title,
      public_description: result.description ?? prev.public_description,
      submit_label: result.submitLabel || prev.submit_label,
      fields: parseFields(result.fields),
    }));
    toast({ title: 'Preview updated', description: 'Review it below, then save.' });
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) {
      toast({ title: 'Name of form is required', variant: 'destructive' });
      return;
    }
    const slug = slugify(form.slug || name);
    setSaving(true);
    const payload = {
      name: name.slice(0, 200),
      slug: slug || null,
      public_url: publicUrlFor(slug) || null,
      ai_prompt: form.ai_prompt.trim() || null,
      database_name: form.database_name.trim().slice(0, 120) || null,
      show_popup: form.show_popup,
      is_published: form.is_published,
      public_title: form.public_title.trim() || name,
      public_description: form.public_description.trim() || null,
      submit_label: form.submit_label.trim() || 'Submit',
      fields: form.fields as never,
    };
    const { error } = editing
      ? await supabase.from('forms').update(payload).eq('id', editing.id)
      : await supabase.from('forms').insert(payload);
    setSaving(false);
    if (error) {
      const duplicate = error.message.includes('forms_slug_key');
      toast({
        title: 'Save failed',
        description: duplicate ? 'That web address is already used by another form.' : error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: editing ? 'Form updated' : 'Form added' });
    setDialogOpen(false);
    fetchItems();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('forms').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Form deleted' });
    setDeleteTarget(null);
    fetchItems();
  };

  const previewDefinition = {
    title: form.public_title || form.name || 'Untitled form',
    description: form.public_description,
    submitLabel: form.submit_label,
    fields: form.fields,
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Forms
            </CardTitle>
            <CardDescription>
              Add, edit and delete forms. Each form gets its own public web address, a live preview,
              and an AI box you can use to change its questions.
            </CardDescription>
          </div>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" />
            Add form
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No forms yet. Add your first one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name of form</TableHead>
                    <TableHead>Public URL</TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead>Popup</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const url = item.slug ? publicUrlFor(item.slug) : item.public_url;
                    return (
                      <TableRow
                        key={item.id}
                        className="cursor-pointer"
                        onClick={() => openEdit(item)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {item.name}
                            {!item.is_published && <Badge variant="outline">Unpublished</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="truncate">{url}</span>
                              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{parseFields(item.fields).length}</TableCell>
                        <TableCell>
                          <Badge variant={item.show_popup ? 'default' : 'secondary'}>
                            {item.show_popup ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => openEdit(item)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete"
                            className="text-destructive"
                            onClick={() => setDeleteTarget(item)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit form' : 'Add form'}</DialogTitle>
            <DialogDescription>
              Set the details, then use the AI box to build or change the questions. The preview shows
              exactly what visitors will see.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="form-name">Name of form</Label>
                <Input
                  id="form-name"
                  value={form.name}
                  maxLength={200}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Volunteer Application"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="form-slug">Public web address</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground shrink-0">
                    {window.location.origin}/
                  </span>
                  <Input
                    id="form-slug"
                    value={form.slug}
                    maxLength={60}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="volunteer"
                  />
                </div>
                {(form.slug || form.name) && (
                  <a
                    href={publicUrlFor(slugify(form.slug || form.name))}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    {publicUrlFor(slugify(form.slug || form.name))}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="form-title">Heading shown to visitors</Label>
                <Input
                  id="form-title"
                  value={form.public_title}
                  maxLength={200}
                  onChange={(e) => setForm({ ...form, public_title: e.target.value })}
                  placeholder="Become a reading volunteer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="form-desc">Intro text</Label>
                <Textarea
                  id="form-desc"
                  rows={2}
                  value={form.public_description}
                  onChange={(e) => setForm({ ...form, public_description: e.target.value })}
                  placeholder="Tell visitors what this form is for…"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="form-prompt" className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI prompt to build or update this form
                </Label>
                <Textarea
                  id="form-prompt"
                  value={form.ai_prompt}
                  rows={5}
                  onChange={(e) => setForm({ ...form, ai_prompt: e.target.value })}
                  placeholder="e.g. Start with a welcome heading and a short intro paragraph, then ask for full name, email, phone, and availability (weekday/weekend) under a section called 'Your availability'."
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : <Sparkles className="w-4 h-4 mr-2" />}
                  {form.fields.length ? 'Update form with AI' : 'Build form with AI'}
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="form-db">Name of database</Label>
                <Input
                  id="form-db"
                  value={form.database_name}
                  maxLength={120}
                  onChange={(e) => setForm({ ...form, database_name: e.target.value })}
                  placeholder="form_submissions"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor="form-popup">Show in popup</Label>
                  <p className="text-xs text-muted-foreground">{form.show_popup ? 'Yes' : 'No'}</p>
                </div>
                <Switch
                  id="form-popup"
                  checked={form.show_popup}
                  onCheckedChange={(checked) => setForm({ ...form, show_popup: checked })}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor="form-published">Live at its public address</Label>
                  <p className="text-xs text-muted-foreground">
                    {form.is_published ? 'Anyone with the link can fill it in' : 'Hidden from visitors'}
                  </p>
                </div>
                <Switch
                  id="form-published"
                  checked={form.is_published}
                  onCheckedChange={(checked) => setForm({ ...form, is_published: checked })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </Label>
              <div className="rounded-lg border bg-muted/30 p-4">
                <FormRenderer definition={previewDefinition} preview />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete form?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleting}
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
