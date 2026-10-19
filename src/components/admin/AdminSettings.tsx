import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Bell, Palette, Construction } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminApi from '@/components/admin/AdminApi';
import AdminForms from '@/components/admin/AdminForms';
import AdminLinks from '@/components/admin/AdminLinks';
import AdminEmails from '@/components/admin/emails/AdminEmails';
import { useAuth } from '@/hooks/useAuth';

export default function AdminSettings() {
  const { isAdmin } = useAuth();

  return (
    <Tabs defaultValue="general" className="space-y-6">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="login">Login</TabsTrigger>
        <TabsTrigger value="api">API</TabsTrigger>
        {isAdmin && <TabsTrigger value="forms">Forms/Link</TabsTrigger>}
        {isAdmin && <TabsTrigger value="emails">Emails</TabsTrigger>}
      </TabsList>

      <TabsContent value="login">
        <AdminLogin />
      </TabsContent>

      <TabsContent value="api">
        <AdminApi />
      </TabsContent>

      {isAdmin && (
        <TabsContent value="forms" className="space-y-6">
          <AdminForms />
          <AdminLinks />
        </TabsContent>
      )}

      {isAdmin && (
        <TabsContent value="emails">
          <AdminEmails />
        </TabsContent>
      )}


      <TabsContent value="general" className="space-y-6">
      <Card>

        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Settings
            <Badge variant="secondary" className="ml-2 gap-1">
              <Construction className="w-3 h-3" />
              Coming Soon
            </Badge>
          </CardTitle>
          <CardDescription>
            Security configuration options will be available in a future update.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>• Require email verification before platform access</p>
          <p>• Require guardian approval for student accounts</p>
          <p>• Require volunteer background checks before matching</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Settings
            <Badge variant="secondary" className="ml-2 gap-1">
              <Construction className="w-3 h-3" />
              Coming Soon
            </Badge>
          </CardTitle>
          <CardDescription>
            Email notification preferences will be configurable in a future update.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>• New registration email alerts</p>
          <p>• Weekly summary reports</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Platform Settings
            <Badge variant="secondary" className="ml-2 gap-1">
              <Construction className="w-3 h-3" />
              Coming Soon
            </Badge>
          </CardTitle>
          <CardDescription>
            General platform configuration will be available in a future update.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>• Maintenance mode</p>
          <p>• Registration toggle</p>
        </CardContent>
      </Card>
      </TabsContent>
    </Tabs>
  );
}
