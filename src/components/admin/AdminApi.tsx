import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, Pencil, Trash2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ApiCredential {
  id: string;
  name: string;
  type: string;
  key_value: string;
  is_active: boolean;
  created_at: string;
}

const emptyForm = { name: '', type: '', key_value: '' };

export default function AdminApi() {
  const [items, setItems] = useState<ApiCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ApiCredential | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiCredential | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('api_credentials')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Could not load API credentials', description: error.message, variant: 'destructive' });
    } else {
      setItems((data ?? []) as ApiCredential[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (item: ApiCredential) => {
    setEditing(item);
    setForm({ name: item.name, type: item.type ?? '', key_value: item.key_value ?? '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      name: name.slice(0, 120),
      type: form.type.trim().slice(0, 60),
      key_value: form.key_value.trim(),
    };
    const { error } = editing
      ? await supabase.from('api_credentials').update(payload).eq('id', editing.id)
      : await supabase.from('api_credentials').insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editing ? 'Credential updated' : 'Credential added' });
    setDialogOpen(false);
    fetchItems();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('api_credentials').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Credential deleted' });
    setDeleteTarget(null);
    fetchItems();
  };

  const mask = (value: string) => (value ? '•'.repeat(Math.min(value.length, 24)) : '—');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              API Credentials
            </CardTitle>
            <CardDescription>
              Store and manage API keys and tokens used by the platform.
            </CardDescription>
          </div>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" />
            Add credential
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No API credentials yet. Add your first one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Key / Token</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        {item.type ? <Badge variant="secondary">{item.type}</Badge> : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[220px]">
                            {revealed[item.id] ? item.key_value || '—' : mask(item.key_value)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            aria-label={revealed[item.id] ? 'Hide key' : 'Show key'}
                            onClick={() =>
                              setRevealed((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                            }
                          >
                            {revealed[item.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit credential' : 'Add credential'}</DialogTitle>
            <DialogDescription>Name, type and the key or token value.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-name">Name (API / credential)</Label>
              <Input
                id="api-name"
                value={form.name}
                maxLength={120}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. OpenAI Production"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-type">Type</Label>
              <Input
                id="api-type"
                value={form.type}
                maxLength={60}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                placeholder="e.g. API key, Bearer token, OAuth"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-key">Key / Token</Label>
              <Input
                id="api-key"
                value={form.key_value}
                onChange={(e) => setForm({ ...form, key_value: e.target.value })}
                placeholder="Paste the key or token"
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
            <AlertDialogTitle>Delete credential?</AlertDialogTitle>
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
