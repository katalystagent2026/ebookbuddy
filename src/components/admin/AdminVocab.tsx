import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react';

interface VocabWord {
  id: string;
  word: string;
  definition: string;
  example: string;
  reading_level: string;
}

const LEVELS = ['Beginner', 'Easy', 'Medium', 'Hard'];

const emptyForm = { word: '', definition: '', example: '', reading_level: '' };

export default function AdminVocab() {
  const { toast } = useToast();
  const [words, setWords] = useState<VocabWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VocabWord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vocab_words')
      .select('*')
      .order('word', { ascending: true });
    if (error) {
      toast({ title: 'Could not load words', description: error.message, variant: 'destructive' });
    } else {
      setWords((data ?? []) as VocabWord[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (w: VocabWord) => {
    setEditing(w);
    setForm({ word: w.word, definition: w.definition, example: w.example, reading_level: w.reading_level });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.word.trim()) {
      toast({ title: 'Word is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      word: form.word.trim(),
      definition: form.definition.trim(),
      example: form.example.trim(),
      reading_level: form.reading_level,
    };
    const { error } = editing
      ? await supabase.from('vocab_words').update(payload).eq('id', editing.id)
      : await supabase.from('vocab_words').insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editing ? 'Word updated' : 'Word added' });
    setDialogOpen(false);
    load();
  };

  const remove = async (w: VocabWord) => {
    if (!window.confirm(`Delete "${w.word}"?`)) return;
    const { error } = await supabase.from('vocab_words').delete().eq('id', w.id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Word deleted' });
    load();
  };

  const filtered = words.filter((w) => {
    const q = search.toLowerCase();
    return (
      w.word.toLowerCase().includes(q) ||
      w.definition.toLowerCase().includes(q) ||
      w.reading_level.toLowerCase().includes(q)
    );
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle>Vocabulary</CardTitle>
            <CardDescription>Add, edit, and delete vocabulary words for reading sessions.</CardDescription>
          </div>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="w-4 h-4" /> Add Word
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search words..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {words.length === 0 ? 'No vocabulary words yet. Add your first word.' : 'No words match your search.'}
          </p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Word</TableHead>
                  <TableHead>Definition</TableHead>
                  <TableHead>Example</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.word}</TableCell>
                    <TableCell className="max-w-xs truncate">{w.definition}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{w.example}</TableCell>
                    <TableCell>{w.reading_level || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(w)} aria-label={`Edit ${w.word}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(w)} aria-label={`Delete ${w.word}`}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Word' : 'Add Word'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update this vocabulary word.' : 'Add a new vocabulary word.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vocab-word">Word</Label>
              <Input
                id="vocab-word"
                value={form.word}
                onChange={(e) => setForm({ ...form, word: e.target.value })}
                placeholder="e.g. curious"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vocab-definition">Definition</Label>
              <Textarea
                id="vocab-definition"
                value={form.definition}
                onChange={(e) => setForm({ ...form, definition: e.target.value })}
                placeholder="e.g. wanting to know or learn something"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vocab-example">Example sentence</Label>
              <Textarea
                id="vocab-example"
                value={form.example}
                onChange={(e) => setForm({ ...form, example: e.target.value })}
                placeholder="e.g. The curious cat peeked inside the box."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Reading level</Label>
              <Select
                value={form.reading_level}
                onValueChange={(v) => setForm({ ...form, reading_level: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a level" />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? 'Save Changes' : 'Add Word'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
