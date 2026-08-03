import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, Loader2, Heart, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
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
  const { toast } = useToast();

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);

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

  const matches = (p: Profile) =>
    p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

  const verified = profiles.filter(p => p.is_verified && matches(p));
  const pending = profiles.filter(p => !p.is_verified && matches(p));

  const renderTable = (rows: Profile[], showActions: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Login Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Zoom Room</TableHead>
          <TableHead>Verified</TableHead>
          <TableHead>Joined</TableHead>
          {showActions && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="font-medium">{p.full_name || 'No name'}</TableCell>
            <TableCell>{p.email}</TableCell>
            <TableCell><Badge>{roles[p.user_id] || 'volunteer'}</Badge></TableCell>
            <TableCell>{zoomName(p.zoom_account_id)}</TableCell>
            <TableCell>
              <Button
                variant={p.is_verified ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleVerified(p)}
              >
                {p.is_verified ? <Check className="w-4 h-4 mr-1" /> : <X className="w-4 h-4 mr-1" />}
                {p.is_verified ? 'Yes' : 'No'}
              </Button>
            </TableCell>
            <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
            {showActions && (
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(p)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={showActions ? 7 : 6} className="text-center text-muted-foreground py-8">
              No volunteers found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

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
              Volunteers ({profiles.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search volunteers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="verified">
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <TabsList>
                <TabsTrigger value="verified">Verified ({verified.length})</TabsTrigger>
                <TabsTrigger value="new">New ({pending.length})</TabsTrigger>
              </TabsList>
              <Button onClick={openAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </div>

            <TabsContent value="verified">{renderTable(verified, true)}</TabsContent>
            <TabsContent value="new">{renderTable(pending, true)}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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
