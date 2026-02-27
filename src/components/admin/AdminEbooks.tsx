import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Search, Loader2, BookOpen, Plus, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Ebook {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  cover_url: string | null;
  reading_level: string | null;
  world_category: string | null;
  page_count: number | null;
  is_active: boolean | null;
  created_at: string;
}

const defaultEbook: Partial<Ebook> = {
  title: '',
  author: '',
  description: '',
  cover_url: '',
  reading_level: '',
  world_category: 'adventure',
  page_count: 0,
  is_active: true,
};

export default function AdminEbooks() {
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEbook, setEditingEbook] = useState<Partial<Ebook> | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchEbooks();
  }, []);

  const fetchEbooks = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('ebooks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error fetching ebooks',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setEbooks(data || []);
    }
    
    setLoading(false);
  };

  const isValidUrl = (url: string): boolean => {
    if (!url) return true; // Optional field
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    if (!editingEbook?.title) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for the ebook.',
        variant: 'destructive',
      });
      return;
    }

    if (editingEbook.cover_url && !isValidUrl(editingEbook.cover_url)) {
      toast({
        title: 'Invalid cover URL',
        description: 'Please enter a valid URL (e.g., https://example.com/image.jpg).',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    if (editingEbook.id) {
      // Update existing
      const { error } = await supabase
        .from('ebooks')
        .update({
          title: editingEbook.title,
          author: editingEbook.author,
          description: editingEbook.description,
          cover_url: editingEbook.cover_url,
          reading_level: editingEbook.reading_level,
          world_category: editingEbook.world_category,
          page_count: editingEbook.page_count,
          is_active: editingEbook.is_active,
        })
        .eq('id', editingEbook.id);

      if (error) {
        toast({
          title: 'Error updating ebook',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Ebook updated successfully' });
        fetchEbooks();
        setIsDialogOpen(false);
      }
    } else {
      // Create new
      const { error } = await supabase
        .from('ebooks')
        .insert({
          title: editingEbook.title,
          author: editingEbook.author,
          description: editingEbook.description,
          cover_url: editingEbook.cover_url,
          reading_level: editingEbook.reading_level,
          world_category: editingEbook.world_category,
          page_count: editingEbook.page_count,
          is_active: editingEbook.is_active ?? true,
        });

      if (error) {
        toast({
          title: 'Error creating ebook',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Ebook created successfully' });
        fetchEbooks();
        setIsDialogOpen(false);
      }
    }

    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ebook?')) return;

    const { error } = await supabase
      .from('ebooks')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error deleting ebook',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Ebook deleted successfully' });
      fetchEbooks();
    }
  };

  const openCreateDialog = () => {
    setEditingEbook(defaultEbook);
    setIsDialogOpen(true);
  };

  const openEditDialog = (ebook: Ebook) => {
    setEditingEbook(ebook);
    setIsDialogOpen(true);
  };

  const filteredEbooks = ebooks.filter(ebook => 
    ebook.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ebook.author?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case 'adventure': return 'bg-amber-100 text-amber-800';
      case 'friendship': return 'bg-pink-100 text-pink-800';
      case 'curiosity': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              eBooks ({ebooks.length})
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search ebooks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add eBook
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEbooks.map((ebook) => (
                <TableRow key={ebook.id}>
                  <TableCell className="font-medium">{ebook.title}</TableCell>
                  <TableCell>{ebook.author || '-'}</TableCell>
                  <TableCell>
                    <Badge className={getCategoryColor(ebook.world_category)}>
                      {ebook.world_category || 'none'}
                    </Badge>
                  </TableCell>
                  <TableCell>{ebook.reading_level || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={ebook.is_active ? 'default' : 'secondary'}>
                      {ebook.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(ebook)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(ebook.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredEbooks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No ebooks found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingEbook?.id ? 'Edit eBook' : 'Add New eBook'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={editingEbook?.title || ''}
                onChange={(e) => setEditingEbook(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Book title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                value={editingEbook?.author || ''}
                onChange={(e) => setEditingEbook(prev => ({ ...prev, author: e.target.value }))}
                placeholder="Author name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editingEbook?.description || ''}
                onChange={(e) => setEditingEbook(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Book description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">World Category</Label>
                <Select
                  value={editingEbook?.world_category || 'adventure'}
                  onValueChange={(value) => setEditingEbook(prev => ({ ...prev, world_category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adventure">Adventure</SelectItem>
                    <SelectItem value="friendship">Friendship</SelectItem>
                    <SelectItem value="curiosity">Curiosity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reading_level">Reading Level</Label>
                <Input
                  id="reading_level"
                  value={editingEbook?.reading_level || ''}
                  onChange={(e) => setEditingEbook(prev => ({ ...prev, reading_level: e.target.value }))}
                  placeholder="e.g., Grade 1-2"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="page_count">Page Count</Label>
                <Input
                  id="page_count"
                  type="number"
                  value={editingEbook?.page_count || 0}
                  onChange={(e) => setEditingEbook(prev => ({ ...prev, page_count: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cover_url">Cover Image URL</Label>
                <Input
                  id="cover_url"
                  value={editingEbook?.cover_url || ''}
                  onChange={(e) => setEditingEbook(prev => ({ ...prev, cover_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={editingEbook?.is_active ?? true}
                onCheckedChange={(checked) => setEditingEbook(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingEbook?.id ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
