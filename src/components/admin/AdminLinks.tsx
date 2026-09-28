import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, Pencil, Trash2, Link2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LinkRow { id: string; name: string; slug: string; forward_email: string; is_active: boolean }
const empty = { name: '', slug: '', forward_email: '', is_active: true };
const BASE = 'https://www.ebookbuddy.org';
const slugify = (v: string) =>
  v.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

export default function AdminLinks() {
  const db = supabase.from('links' as never) as any;
  const [items, setItems] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LinkRow | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from('links' as never) as any).select('*').order('created_at', { ascending: false });
    if (error) toast({ title: 'Could not load links', description: error.message, variant: 'destructive' });
    setItems((data ?? []) as LinkRow[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const name = form.name.trim();
    const slug = slugify(form.slug || name);
    if (!name || !slug) { toast({ title: 'Name and web address are required', variant: 'destructive' }); return; }
    setSaving(true);
    const payload = { name, slug, forward_email: form.forward_email.trim(), is_active: form.is_active };
    const t = supabase.from('links' as never) as any;
    const { error } = editing ? await t.update(payload).eq('id', editing.id) : await t.insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: 'Save failed', description: error.message.includes('links_slug_key') ? 'That web address is already used.' : error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editing ? 'Link updated' : 'Link added' });
    setOpen(false); load();
  };

  const remove = async (row: LinkRow) => {
    if (!confirm(`Delete "${row.name}"?`)) return;
    const { error } = await (supabase.from('links' as never) as any).delete().eq('id', row.id);
    if (error) toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Link deleted' }); load(); }
  };

  const toggle = async (row: LinkRow, on: boolean) => {
    const { error } = await (supabase.from('links' as never) as any).update({ is_active: on }).eq('id', row.id);
    if (error) toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    else load();
  };
  void db;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2"><Link2 className="w-5 h-5" />Links</CardTitle>
          <CardDescription>Short web addresses on www.ebookbuddy.org that forward visitors to an email or website.</CardDescription>
        </div>
        <Button onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />Add link
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No links yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name of link</TableHead>
                  <TableHead>Public URL</TableHead>
                  <TableHead>Forward email</TableHead>
                  <TableHead>On/Off</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>
                      <a href={`${BASE}/${row.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                        {`${BASE}/${row.slug}`}<ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </TableCell>
                    <TableCell className="text-sm">{row.forward_email || '—'}</TableCell>
                    <TableCell><Switch checked={row.is_active} onCheckedChange={(v) => toggle(row, v)} aria-label="On or off" /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => { setEditing(row); setForm({ name: row.name, slug: row.slug, forward_email: row.forward_email, is_active: row.is_active }); setOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Delete" className="text-destructive" onClick={() => remove(row)}>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit link' : 'Add link'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="link-name">Name of link</Label>
              <Input id="link-name" value={form.name} maxLength={200} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Contact us" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-slug">Public URL</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground shrink-0">{BASE}/</span>
                <Input id="link-slug" value={form.slug} maxLength={60} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="contact" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-fwd">Forward email</Label>
              <Input id="link-fwd" value={form.forward_email} maxLength={320} onChange={(e) => setForm({ ...form, forward_email: e.target.value })} placeholder="hello@ebookbuddy.org (or a website address)" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="link-on">{form.is_active ? 'On' : 'Off'}</Label>
              <Switch id="link-on" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
