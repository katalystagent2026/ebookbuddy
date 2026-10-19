import { useEffect, useState } from 'react';
import { Mail, Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import EmailEditor, { type EmailTemplate } from './EmailEditor';
import { EMAIL_LAYOUTS, EMAIL_PURPOSES } from '../../../../supabase/functions/_shared/email';

const purposeLabel = (id: string | null) => EMAIL_PURPOSES.find((p) => p.id === id)?.label;
const layoutLabel = (id: string) => EMAIL_LAYOUTS.find((l) => l.id === id)?.label ?? id;

export default function AdminEmails() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  // undefined = list view, null = new email, otherwise the email being edited.
  const [editing, setEditing] = useState<EmailTemplate | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('email_templates')
      .select('id, name, subject, body_html, layout, purpose, language, updated_at')
      .order('updated_at', { ascending: false });
    if (error) toast({ title: 'Error loading emails', description: error.message, variant: 'destructive' });
    setTemplates(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('email_templates').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast({ title: 'Error deleting email', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Email deleted' });
    setDeleteTarget(null);
    fetchTemplates();
  };

  if (editing !== undefined) {
    return (
      <EmailEditor
        template={editing}
        onDone={(saved) => {
          setEditing(undefined);
          if (saved) fetchTemplates();
        }}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Emails ({templates.length})
            </CardTitle>
            <CardDescription className="mt-1">
              Write the automatic emails families and volunteers receive. Emails without a saved version here use the
              built-in wording.
            </CardDescription>
          </div>
          <Button onClick={() => setEditing(null)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Email
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : templates.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No saved emails yet. Click <strong>Add Email</strong> to write one.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Used for</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Layout</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>
                    {purposeLabel(t.purpose) ?? <Badge variant="secondary">Not used</Badge>}
                  </TableCell>
                  <TableCell>{t.language === 'es' ? 'Spanish' : 'English'}</TableCell>
                  <TableCell>{layoutLabel(t.layout)}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(t.updated_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${t.name}`} onClick={() => setEditing(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${t.name}`} onClick={() => setDeleteTarget(t)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.purpose
                ? 'This email will go back to using the built-in wording. This cannot be undone.'
                : 'This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
