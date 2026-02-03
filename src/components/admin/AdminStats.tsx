import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, GraduationCap, Heart, BookOpen, TrendingUp, ClipboardList } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Stats {
  totalUsers: number;
  totalStudents: number;
  totalVolunteers: number;
  totalEbooks: number;
  pendingRegistrations: number;
  approvedRegistrations: number;
}

export default function AdminStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    
    try {
      // Fetch all stats in parallel
      const [
        { count: totalUsers },
        { data: studentRoles },
        { data: volunteerRoles },
        { count: totalEbooks },
        { count: pendingRegistrations },
        { count: approvedRegistrations }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('user_roles').select('user_id').eq('role', 'student'),
        supabase.from('user_roles').select('user_id').eq('role', 'volunteer'),
        supabase.from('ebooks').select('*', { count: 'exact', head: true }),
        supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      ]);

      setStats({
        totalUsers: totalUsers || 0,
        totalStudents: studentRoles?.length || 0,
        totalVolunteers: volunteerRoles?.length || 0,
        totalEbooks: totalEbooks || 0,
        pendingRegistrations: pendingRegistrations || 0,
        approvedRegistrations: approvedRegistrations || 0,
      });
    } catch (error: any) {
      toast({
        title: 'Error fetching stats',
        description: error.message,
        variant: 'destructive',
      });
    }
    
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Students',
      value: stats?.totalStudents || 0,
      icon: GraduationCap,
      color: 'text-golden',
      bg: 'bg-golden/10',
    },
    {
      title: 'Volunteers',
      value: stats?.totalVolunteers || 0,
      icon: Heart,
      color: 'text-forest',
      bg: 'bg-forest/10',
    },
    {
      title: 'eBooks',
      value: stats?.totalEbooks || 0,
      icon: BookOpen,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Pending Registrations',
      value: stats?.pendingRegistrations || 0,
      icon: ClipboardList,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
    },
    {
      title: 'Approved Registrations',
      value: stats?.approvedRegistrations || 0,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
