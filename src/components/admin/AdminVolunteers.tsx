import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

export default function AdminVolunteers() {
  const [volunteers, setVolunteers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchVolunteers();
  }, []);

  const fetchVolunteers = async () => {
    setLoading(true);
    
    // First get all user_ids with 'volunteer' role
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'volunteer');

    if (rolesError) {
      toast({
        title: 'Error fetching volunteers',
        description: rolesError.message,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    if (!rolesData || rolesData.length === 0) {
      setVolunteers([]);
      setLoading(false);
      return;
    }

    const volunteerUserIds = rolesData.map((r: { user_id: string }) => r.user_id);

    // Then fetch profiles for those users
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('user_id', volunteerUserIds)
      .order('created_at', { ascending: false });

    if (profilesError) {
      toast({
        title: 'Error fetching volunteer profiles',
        description: profilesError.message,
        variant: 'destructive',
      });
    } else {
      setVolunteers(profilesData || []);
    }
    
    setLoading(false);
  };

  const filteredVolunteers = volunteers.filter(volunteer => 
    volunteer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    volunteer.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Volunteers ({volunteers.length})
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVolunteers.map((volunteer) => (
                <TableRow key={volunteer.id}>
                  <TableCell className="font-medium">
                    {volunteer.full_name || 'No name'}
                  </TableCell>
                  <TableCell>{volunteer.email}</TableCell>
                  <TableCell>
                    <Badge>Volunteer</Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(volunteer.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {filteredVolunteers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No volunteers found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
