import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminStats from './AdminStats';
import AdminSessions from './AdminSessions';

export default function AdminStatsTabs() {
  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="sessions">Sessions</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <AdminStats />
      </TabsContent>
      <TabsContent value="sessions">
        <AdminSessions />
      </TabsContent>
    </Tabs>
  );
}
