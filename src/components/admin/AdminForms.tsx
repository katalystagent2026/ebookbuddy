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
import { Loader2, Plus, Pencil, Trash2, FileText, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FormRecord {
  id: string;
  name: string;
  public_url: string | null;
  ai_prompt: string | null;
  database_name: string | null;
  show_popup: boolean;
  created_at: string;
}

const emptyForm = () => ({
  name: '',
  public_url: '',
  ai_prompt: '',
  database_name: '',
  show_popup: false,
});

export default function AdminForms() {
  const [items, setItems] = useState<FormRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FormRecord | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
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
      setItems((data ?? []) as FormRecord[]);
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
      public_url: item.public_url ?? '',
      ai_prompt: item.ai_prompt ?? '',
      database_name: item.database_name ?? '',
      show_popup: item.show_popup,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) {
      toast({ title: 'Name of form is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      name: name.slice(0, 200),
      public_url: form.public_url.trim() || null,
      ai_prompt: form.ai_prompt.trim() || null,
      database_name: form.database_name.trim().slice(0, 120) || null,
      show_popup: form.show_popup,
    };
    const { error } = editing
      ? await supabase.from('forms').update(payload).eq('id', editing.id)
      : await supabase.from('forms').insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
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
              Add, edit and delete forms. Click a form to see its public link, the AI prompt that built it,
              its database and whether it shows in a popup.
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
                    <TableHead>Database</TableHead>
                    <TableHead>Popup</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer"
                      onClick={() => openEdit(item)}
                    >
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="max-w-[240px]">
                        {item.public_url ? (
                          <a
                            href={item.public_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="truncate">{item.public_url}</span>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{item.database_name || '—'}</TableCell>
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit form' : 'Add form'}</DialogTitle>
            <DialogDescription>
              Everything about this form lives in one record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="form-name">Name of form</Label>
              <Input
                id="form-name"
                value={form.name}
                maxLength={200}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Student Registration"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-url">Public URL</Label>
              <Input
                id="form-url"
                value={form.public_url}
                onChange={(e) => setForm({ ...form, public_url: e.target.value })}
                placeholder="https://ebookbuddy.org/register"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-prompt">AI prompt that builds the form</Label>
              <Textarea
                id="form-prompt"
                value={form.ai_prompt}
                rows={5}
                onChange={(e) => setForm({ ...form, ai_prompt: e.target.value })}
                placeholder="Describe the fields and rules the form should have…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-db">Name of database</Label>
              <Input
                id="form-db"
                value={form.database_name}
                maxLength={120}
                onChange={(e) => setForm({ ...form, database_name: e.target.value })}
                placeholder="e.g. student_registrations"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="form-popup">Show in popup</Label>
                <p className="text-xs text-muted-foreground">
                  {form.show_popup ? 'Yes' : 'No'}
                </p>
              </div>
              <Switch
                id="form-popup"
                checked={form.show_popup}
                onCheckedChange={(checked) => setForm({ ...form, show_popup: checked })}
              />
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
