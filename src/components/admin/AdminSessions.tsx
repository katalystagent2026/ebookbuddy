import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCw, Video, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SessionRow {
  id: string;
  session_name: string;
  video_provider: string;
  user_name: string;
  user_email: string;
  user_role: string;
  entered_at: string;
  exited_at: string | null;
  duration_minutes: number | null;
  error_log: string | null;
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

const formatTime = (value: string | null) =>
  value ? new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '—';

const roleVariant = (role: string) => {
  switch (role) {
    case 'admin':
      return 'default' as const;
    case 'volunteer':
      return 'secondary' as const;
    default:
      return 'outline' as const;
  }
};

export default function AdminSessions() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('meeting_sessions')
      .select('id, session_name, video_provider, user_name, user_email, user_role, entered_at, exited_at, duration_minutes, error_log')
      .order('entered_at', { ascending: false })
      .limit(500);

    if (error) {
      toast({ title: 'Error loading sessions', description: error.message, variant: 'destructive' });
    } else {
      setSessions((data as SessionRow[]) || []);
    }
    setLoading(false);
  };

  const term = search.trim().toLowerCase();
  const filtered = term
    ? sessions.filter((s) =>
        [s.session_name, s.user_name, s.user_email, s.user_role]
          .join(' ')
          .toLowerCase()
          .includes(term),
      )
    : sessions;

  const liveCount = sessions.filter((s) => !s.exited_at).length;
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Session Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{sessions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Currently In Meeting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{liveCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Minutes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalMinutes}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                Sessions
              </CardTitle>
              <CardDescription className="mt-1">
                Every meeting entry and exit, tracked from the active meeting setup.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search session or user…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56"
              />
              <Button variant="outline" size="icon" onClick={fetchSessions}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead>Exit</TableHead>
                    <TableHead>Minutes</TableHead>
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.session_name || '—'}</TableCell>
                      <TableCell>{formatDate(s.entered_at)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{s.user_name || '—'}</div>
                        <div className="text-xs text-muted-foreground">{s.user_email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={roleVariant(s.user_role)}>{s.user_role}</Badge>
                      </TableCell>
                      <TableCell>{formatTime(s.entered_at)}</TableCell>
                      <TableCell>
                        {s.exited_at ? formatTime(s.exited_at) : <Badge variant="secondary">In meeting</Badge>}
                      </TableCell>
                      <TableCell>{s.duration_minutes ?? '—'}</TableCell>
                      <TableCell className="max-w-[220px]">
                        {s.error_log ? (
                          <span className="flex items-start gap-1 text-xs text-destructive">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span className="break-words">{s.error_log}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No sessions recorded yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
