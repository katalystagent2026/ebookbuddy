import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, Loader2, Heart, Plus, Pencil, Trash2, Check, X, Download, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  is_verified: boolean;
  zoom_account_id: string | null;
}

interface ZoomAccount {
  id: string;
  name: string;
}

interface Entry {
  id: string;
  formName: string;
  data: Record<string, unknown>;
  created_at: string;
}

interface Row {
  key: string; kind: 'account' | 'entry'; name: string; email: string; phone: string;
  source: string; role: string; zoom: string; verified: boolean; date: string;
  profile?: Profile; entry?: Entry;
}

const pick = (data: Record<string, unknown>, keys: string[]) => {
  for (const k of keys) {
    const hit = Object.keys(data).find(d => d.toLowerCase() === k)
      ?? Object.keys(data).find(d => d.toLowerCase().includes(k));
    if (hit && data[hit]) return String(data[hit]);
  }
  return '';
};

const ROLES = ['volunteer', 'student', 'user', 'admin'] as const;

const emptyForm = {
  full_name: '',
  email: '',
  password: '',
  role: 'volunteer' as string,
  zoom_account_id: 'none',
  is_verified: false,
};

export default function AdminVolunteers() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [zoomAccounts, setZoomAccounts] = useState<ZoomAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewEntry, setViewEntry] = useState<Entry | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);

    const { data: formRows } = await supabase.from('forms').select('id, name').eq('add_to_volunteers' as never, true as never);
    const formNames: Record<string, string> = {};
    (formRows || []).forEach((f: { id: string; name: string }) => { formNames[f.id] = f.name; });
    if (Object.keys(formNames).length) {
      const { data: subs } = await supabase.from('form_submissions')
        .select('id, form_id, data, created_at').in('form_id', Object.keys(formNames))
        .order('created_at', { ascending: false });
      setEntries((subs || []).map(x => ({
        id: x.id, formName: formNames[x.form_id], created_at: x.created_at,
        data: (x.data && typeof x.data === 'object' && !Array.isArray(x.data) ? x.data : {}) as Record<string, unknown>,
      })));
    } else setEntries([]);

    const [{ data: rolesData, error: rolesError }, { data: zoomData }] = await Promise.all([
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('zoom_accounts').select('id, name').order('name'),
    ]);

    if (rolesError) {
      toast({ title: 'Error fetching roles', description: rolesError.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    setZoomAccounts(zoomData || []);

    const rolesMap: Record<string, string> = {};
    (rolesData || []).forEach((r) => { rolesMap[r.user_id] = r.role; });
    setRoles(rolesMap);

    const volunteerIds = (rolesData || []).filter(r => r.role === 'volunteer').map(r => r.user_id);

    if (volunteerIds.length === 0) {
      setProfiles([]);
      setLoading(false);
      return;
    }

    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('user_id', volunteerIds)
      .order('created_at', { ascending: false });

    if (profilesError) {
      toast({ title: 'Error fetching volunteers', description: profilesError.message, variant: 'destructive' });
    } else {
      setProfiles((profilesData || []) as Profile[]);
    }

    setLoading(false);
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: Profile) => {
    setEditing(p);
    setForm({
      full_name: p.full_name || '',
      email: p.email,
      password: '',
      role: roles[p.user_id] || 'volunteer',
      zoom_account_id: p.zoom_account_id || 'none',
      is_verified: p.is_verified,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        fullName: form.full_name,
        email: form.email,
        role: form.role,
        zoomAccountId: form.zoom_account_id === 'none' ? null : form.zoom_account_id,
        isVerified: form.is_verified,
      };

      const body = editing
        ? { action: 'update', userId: editing.user_id, ...payload }
        : { action: 'create', password: form.password, ...payload };

      const { data, error } = await supabase.functions.invoke('admin-manage-user', { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: editing ? 'User updated' : 'User created' });
      setDialogOpen(false);
      fetchAll();
    } catch (error: any) {
      toast({ title: 'Error saving user', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleVerified = async (p: Profile) => {
    const next = !p.is_verified;
    setProfiles(prev => prev.map(x => x.user_id === p.user_id ? { ...x, is_verified: next } : x));
    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: next })
      .eq('user_id', p.user_id);
    if (error) {
      setProfiles(prev => prev.map(x => x.user_id === p.user_id ? { ...x, is_verified: !next } : x));
      toast({ title: 'Error updating status', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: next ? 'Moved to Verified' : 'Moved to New' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-user', {
        body: { action: 'delete', userId: deleteTarget.user_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'User deleted' });
      setDeleteTarget(null);
      fetchAll();
    } catch (error: any) {
      toast({ title: 'Error deleting user', description: error.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const zoomName = (id: string | null) =>
    zoomAccounts.find(z => z.id === id)?.name || '—';

  const rows: Row[] = [
    ...profiles.map((p): Row => ({
      key: `p-${p.id}`, kind: 'account', name: p.full_name || 'No name', email: p.email, phone: '',
      source: 'Account', role: roles[p.user_id] || 'volunteer', zoom: zoomName(p.zoom_account_id),
      verified: p.is_verified, date: p.created_at, profile: p,
    })),
    ...entries.map((e): Row => ({
      key: `s-${e.id}`, kind: 'entry', name: pick(e.data, ['full_name']) || [pick(e.data, ['first_name']), pick(e.data, ['last_name'])].filter(Boolean).join(' ') || pick(e.data, ['name']) || 'No name',
      email: pick(e.data, ['email']), phone: pick(e.data, ['phone']), source: e.formName,
      role: 'applicant', zoom: '—', verified: false, date: e.created_at, entry: e,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const q = searchQuery.toLowerCase();
  const filtered = rows.filter(r =>
    (sourceFilter === 'all' || r.source === sourceFilter) &&
    (statusFilter === 'all' || (statusFilter === 'verified' ? r.verified : !r.verified)) &&
    (!q || [r.name, r.email, r.phone, r.source, r.entry ? JSON.stringify(r.entry.data) : '']
      .some(v => v.toLowerCase().includes(q))),
  );
  const sources = Array.from(new Set(rows.map(r => r.source)));
  const allChecked = filtered.length > 0 && filtered.every(r => checked.has(r.key));
  const toggleCheck = (key: string) => setChecked(prev => {
    const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n;
  });
  const toggleAll = () => setChecked(prev => {
    const n = new Set(prev);
    filtered.forEach(r => (allChecked ? n.delete(r.key) : n.add(r.key)));
    return n;
  });

  const downloadCsv = () => {
    const picked = filtered.filter(r => checked.has(r.key));
    const list = picked.length ? picked : filtered;
    const extra = Array.from(new Set(list.flatMap(r => (r.entry ? Object.keys(r.entry.data) : []))));
    const head = ['Name', 'Email', 'Phone', 'Submitted on', 'Role', 'Zoom Room', 'Verified', 'Date', ...extra];
    const esc = (v: unknown) => {
      const t = Array.isArray(v) ? v.join('; ') : v == null ? '' : String(v);
      return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const lines = [head, ...list.map(r => [
      r.name, r.email, r.phone, r.source, r.role, r.zoom, r.verified ? 'Yes' : 'No',
      new Date(r.date).toLocaleString(), ...extra.map(k => r.entry?.data[k]),
    ])].map(l => l.map(esc).join(','));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `volunteers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const deleteEntry = async (e: Entry) => {
    if (!confirm('Delete this form entry?')) return;
    const { error } = await supabase.from('form_submissions').delete().eq('id', e.id);
    if (error) toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Entry deleted' }); fetchAll(); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Volunteers ({rows.length})
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={downloadCsv} disabled={filtered.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Download CSV{checked.size ? ` (${filtered.filter(r => checked.has(r.key)).length})` : ''}
              </Button>
              <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add User</Button>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap pt-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search volunteers..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-56" aria-label="Filter by form"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" aria-label="Filter by status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="new">New</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allChecked} onCheckedChange={toggleAll} aria-label="Select all" />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Submitted on</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Zoom Room</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.key} data-state={checked.has(r.key) ? 'selected' : undefined}>
                  <TableCell>
                    <Checkbox checked={checked.has(r.key)} onCheckedChange={() => toggleCheck(r.key)} aria-label={`Select ${r.name}`} />
                  </TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.email || '—'}</TableCell>
                  <TableCell><Badge variant={r.kind === 'entry' ? 'secondary' : 'outline'}>{r.source}</Badge></TableCell>
                  <TableCell><Badge>{r.role}</Badge></TableCell>
                  <TableCell>{r.zoom}</TableCell>
                  <TableCell>
                    {r.profile ? (
                      <Button variant={r.verified ? 'default' : 'outline'} size="sm" onClick={() => toggleVerified(r.profile!)}>
                        {r.verified ? <Check className="w-4 h-4 mr-1" /> : <X className="w-4 h-4 mr-1" />}
                        {r.verified ? 'Yes' : 'No'}
                      </Button>
                    ) : <span className="text-sm text-muted-foreground">New</span>}
                  </TableCell>
                  <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {r.profile ? (
                        <>
                          <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => openEdit(r.profile!)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => setDeleteTarget(r.profile!)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" aria-label="View" onClick={() => setViewEntry(r.entry!)}><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => deleteEntry(r.entry!)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">No volunteers found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!viewEntry} onOpenChange={(o) => !o && setViewEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewEntry?.formName} entry</DialogTitle>
            <DialogDescription>{viewEntry && new Date(viewEntry.created_at).toLocaleString()}</DialogDescription>
          </DialogHeader>
          <dl className="space-y-2 text-sm">
            {viewEntry && Object.entries(viewEntry.data).map(([k, v]) => (
              <div key={k} className="grid grid-cols-3 gap-2">
                <dt className="font-medium capitalize">{k.replace(/_/g, ' ')}</dt>
                <dd className="col-span-2 break-words">{Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v ?? '')}</dd>
              </div>
            ))}
          </dl>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit User' : 'Add User'}</DialogTitle>
            <DialogDescription>
              Set the details below. Marking verified moves the user to the Verified tab.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="v-name">Name</Label>
              <Input
                id="v-name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="v-email">Login Email</Label>
              <Input
                id="v-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                maxLength={255}
              />
            </div>
            {!editing && (
              <div className="space-y-2">
                <Label htmlFor="v-password">Password</Label>
                <Input
                  id="v-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="At least 6 characters"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Zoom Room</Label>
                <Select
                  value={form.zoom_account_id}
                  onValueChange={(v) => setForm({ ...form, zoom_account_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {zoomAccounts.map(z => (
                      <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Verified</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={form.is_verified ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setForm({ ...form, is_verified: true })}
                >
                  Yes
                </Button>
                <Button
                  type="button"
                  variant={!form.is_verified ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setForm({ ...form, is_verified: false })}
                >
                  No
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editing ? 'Save Changes' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the account and its profile. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
