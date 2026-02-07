import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Loader2, UserCog, Eye, EyeOff, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role_type: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

export default function AdminUsers() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPasswordUserId, setEditingPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      toast({
        title: 'Error fetching users',
        description: profilesError.message,
        variant: 'destructive',
      });
    } else {
      setProfiles(profilesData || []);
      
      // Fetch roles for all users
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesData) {
        const rolesMap: Record<string, string> = {};
        rolesData.forEach((r: UserRole) => {
          rolesMap[r.user_id] = r.role;
        });
        setRoles(rolesMap);
      }
    }
    
    setLoading(false);
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole as 'admin' | 'user' | 'student' | 'volunteer' })
      .eq('user_id', userId);

    if (error) {
      toast({
        title: 'Error updating role',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setRoles(prev => ({ ...prev, [userId]: newRole }));
      toast({
        title: 'Role updated',
        description: 'User role has been updated successfully.',
      });
    }
  };

  const handleSavePassword = async (userId: string) => {
    if (!newPassword) {
      toast({
        title: 'Password required',
        description: 'Please enter a password.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    setSavingPassword(true);

    try {
      const { data, error } = await supabase.functions.invoke('update-user-password', {
        body: { userId, newPassword },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'Password updated',
        description: 'User password has been updated successfully.',
      });
      
      setEditingPasswordUserId(null);
      setNewPassword('');
      setShowPassword(false);
    } catch (error: any) {
      toast({
        title: 'Error updating password',
        description: error.message || 'Failed to update password',
        variant: 'destructive',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingPasswordUserId(null);
    setNewPassword('');
    setShowPassword(false);
  };

  const filteredProfiles = profiles.filter(profile => 
    profile.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'volunteer': return 'default';
      case 'student': return 'secondary';
      default: return 'outline';
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
              <UserCog className="w-5 h-5" />
              All Users ({profiles.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
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
                <TableHead>Password</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProfiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">
                    {profile.full_name || 'No name'}
                  </TableCell>
                  <TableCell>{profile.email}</TableCell>
                  <TableCell>
                    {editingPasswordUserId === profile.user_id ? (
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New password"
                            className="w-32 pr-8"
                            disabled={savingPassword}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <Button
                          size="icon"
                          variant="default"
                          onClick={() => handleSavePassword(profile.user_id)}
                          disabled={savingPassword}
                          className="h-8 w-8"
                        >
                          {savingPassword ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 text-primary" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={handleCancelEdit}
                          disabled={savingPassword}
                          className="h-8 w-8"
                        >
                          <X className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingPasswordUserId(profile.user_id)}
                      >
                        Set Password
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(roles[profile.user_id] || 'user')}>
                      {roles[profile.user_id] || 'user'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(profile.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={roles[profile.user_id] || 'user'}
                      onValueChange={(value) => updateUserRole(profile.user_id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="volunteer">Volunteer</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProfiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No users found
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
