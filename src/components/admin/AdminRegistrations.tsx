import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ClipboardList, Check, X, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Registration {
  id: string;
  user_id: string | null;
  registration_type: string;
  status: string;
  guardian_name: string | null;
  guardian_email: string | null;
  guardian_phone: string | null;
  school_name: string | null;
  grade_level: string | null;
  reading_level: string | null;
  notes: string | null;
  created_at: string;
}

export default function AdminRegistrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error fetching registrations',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setRegistrations(data || []);
    }
    
    setLoading(false);
  };

  const updateRegistrationStatus = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('registrations')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error updating registration',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setRegistrations(prev => 
        prev.map(r => r.id === id ? { ...r, status } : r)
      );
      toast({
        title: `Registration ${status}`,
        description: `The registration has been ${status}.`,
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
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
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Registrations ({registrations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Guardian</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.map((registration) => (
                <TableRow key={registration.id}>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {registration.registration_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{registration.guardian_name || '-'}</TableCell>
                  <TableCell>{registration.school_name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(registration.status)}>
                      {registration.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(registration.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedRegistration(registration)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Registration Details</DialogTitle>
                          </DialogHeader>
                          {selectedRegistration && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Type</p>
                                  <p className="font-medium capitalize">{selectedRegistration.registration_type}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Status</p>
                                  <Badge variant={getStatusBadgeVariant(selectedRegistration.status)}>
                                    {selectedRegistration.status}
                                  </Badge>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Guardian Name</p>
                                  <p className="font-medium">{selectedRegistration.guardian_name || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Guardian Email</p>
                                  <p className="font-medium">{selectedRegistration.guardian_email || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">School</p>
                                  <p className="font-medium">{selectedRegistration.school_name || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Grade Level</p>
                                  <p className="font-medium">{selectedRegistration.grade_level || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Reading Level</p>
                                  <p className="font-medium">{selectedRegistration.reading_level || '-'}</p>
                                </div>
                              </div>
                              {selectedRegistration.notes && (
                                <div>
                                  <p className="text-sm text-muted-foreground">Notes</p>
                                  <p className="font-medium">{selectedRegistration.notes}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      {registration.status === 'pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => updateRegistrationStatus(registration.id, 'approved')}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => updateRegistrationStatus(registration.id, 'rejected')}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {registrations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No registrations found
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
