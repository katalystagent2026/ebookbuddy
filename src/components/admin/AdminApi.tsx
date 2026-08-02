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

interface CredentialEntry {
  id: string;
  credential_id: string;
  type: string;
  key_value: string;
}

interface ApiCredential {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  entries: CredentialEntry[];
}

interface CredentialRow { id?: string; type: string; key_value: string }
const emptyRows = (): CredentialRow[] => [{ type: '', key_value: '' }, { type: '', key_value: '' }];

export default function AdminApi() {
  const [items, setItems] = useState<ApiCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ApiCredential | null>(null);
  const [form, setForm] = useState<{ name: string; rows: CredentialRow[] }>({ name: '', rows: emptyRows() });
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiCredential | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const fetchItems = async () => {
    setLoading(true);
    const [{ data: creds, error }, { data: entries, error: entriesError }] = await Promise.all([
      supabase.from('api_credentials').select('*').order('created_at', { ascending: false }),
      supabase.from('api_credential_entries').select('*').order('created_at', { ascending: true }),
    ]);
    const err = error || entriesError;
    if (err) {
      toast({ title: 'Could not load API credentials', description: err.message, variant: 'destructive' });
    } else {
      const grouped = (creds ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        is_active: c.is_active,
        created_at: c.created_at,
        entries: ((entries ?? []) as CredentialEntry[]).filter((e) => e.credential_id === c.id),
      }));
      setItems(grouped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openNew = () => {
    setEditing(null);
    setRemovedIds([]);
    setForm({ name: '', rows: emptyRows() });
    setDialogOpen(true);
  };

  const openEdit = (item: ApiCredential) => {
    setEditing(item);
    setRemovedIds([]);
    setForm({
      name: item.name,
      rows: item.entries.length
        ? item.entries.map((e) => ({ id: e.id, type: e.type ?? '', key_value: e.key_value ?? '' }))
        : emptyRows(),
    });
    setDialogOpen(true);
  };

  const updateRow = (index: number, patch: Partial<CredentialRow>) => {
    setForm((prev) => ({
      ...prev,
      rows: prev.rows.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    }));
  };

  const addRow = () => setForm((prev) => ({ ...prev, rows: [...prev.rows, { type: '', key_value: '' }] }));
  const removeRow = (index: number) => {
    setForm((prev) => {
      const row = prev.rows[index];
      if (row?.id) setRemovedIds((ids) => [...ids, row.id!]);
      return { ...prev, rows: prev.rows.filter((_, i) => i !== index) };
    });
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    const rows = form.rows
      .map((r) => ({ id: r.id, type: r.type.trim().slice(0, 60), key_value: r.key_value.trim() }))
      .filter((r) => r.type || r.key_value);

    if (rows.length === 0) {
      toast({ title: 'Add at least one type or key/token', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      let credentialId = editing?.id;
      if (editing) {
        const { error } = await supabase
          .from('api_credentials')
          .update({ name: name.slice(0, 120) })
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('api_credentials')
          .insert({ name: name.slice(0, 120) })
          .select('id')
          .single();
        if (error) throw error;
        credentialId = data.id;
      }

      if (removedIds.length) {
        const { error } = await supabase.from('api_credential_entries').delete().in('id', removedIds);
        if (error) throw error;
      }

      const updates = rows.filter((r) => r.id);
      for (const r of updates) {
        const { error } = await supabase
          .from('api_credential_entries')
          .update({ type: r.type, key_value: r.key_value })
          .eq('id', r.id!);
        if (error) throw error;
      }

      const inserts = rows
        .filter((r) => !r.id)
        .map((r) => ({ credential_id: credentialId!, type: r.type, key_value: r.key_value }));
      if (inserts.length) {
        const { error } = await supabase.from('api_credential_entries').insert(inserts);
        if (error) throw error;
      }

      toast({ title: editing ? 'Credential updated' : 'Credential added' });
      setDialogOpen(false);
      fetchItems();
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
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
              Each name is one record that groups all of its types and keys/tokens.
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
                    <TableHead>Types &amp; Keys / Tokens</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="align-top">
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        {item.entries.length === 0 ? (
                          <span className="text-sm text-muted-foreground">—</span>
                        ) : (
                          <div className="space-y-2">
                            {item.entries.map((entry) => (
                              <div key={entry.id} className="flex items-center gap-2">
                                {entry.type ? (
                                  <Badge variant="secondary">{entry.type}</Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">no type</span>
                                )}
                                <span className="font-mono text-xs truncate max-w-[220px]">
                                  {revealed[entry.id] ? entry.key_value || '—' : mask(entry.key_value)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  aria-label={revealed[entry.id] ? 'Hide key' : 'Show key'}
                                  onClick={() =>
                                    setRevealed((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))
                                  }
                                >
                                  {revealed[entry.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
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
            <DialogDescription>
              One name holds all the type and key/token pairs listed below.
            </DialogDescription>
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
            <div className="space-y-3">
              <div className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)_auto] gap-3">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Label className="text-xs text-muted-foreground">Key / Token</Label>
                <span className="w-8" />
              </div>
              {form.rows.map((row, index) => (
                <div key={row.id ?? index} className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)_auto] gap-3 items-center">
                  <Input
                    value={row.type}
                    maxLength={60}
                    onChange={(e) => updateRow(index, { type: e.target.value })}
                    placeholder="API key"
                    aria-label={`Type ${index + 1}`}
                  />
                  <Input
                    value={row.key_value}
                    onChange={(e) => updateRow(index, { key_value: e.target.value })}
                    placeholder="Paste the key or token"
                    aria-label={`Key or token ${index + 1}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    aria-label={`Remove row ${index + 1}`}
                    disabled={form.rows.length === 1}
                    onClick={() => removeRow(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addRow}>
                <Plus className="w-4 h-4 mr-2" />
                Add row
              </Button>
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
              "{deleteTarget?.name}" and all of its types and keys/tokens will be permanently removed.
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
