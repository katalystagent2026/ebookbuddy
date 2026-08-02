import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Bell, Palette, Construction } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import AdminUsers from '@/components/admin/AdminUsers';

export default function AdminSettings() {
  return (
    <div className="space-y-6">
      <AdminUsers />


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
    </div>
  );
}
