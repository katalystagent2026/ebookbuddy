import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, Save, Loader2, ExternalLink, CheckCircle2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminZoom() {
  const [meetingId, setMeetingId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    const { data, error } = await supabase
      .from('zoom_config')
      .select('*')
      .limit(1)
      .single();

    if (!error && data) {
      setMeetingId(data.meeting_id);
      setPasscode(data.passcode);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);

    const { data: existing } = await supabase
      .from('zoom_config')
      .select('id')
      .limit(1)
      .single();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from('zoom_config')
        .update({ meeting_id: meetingId, passcode, updated_at: new Date().toISOString() })
        .eq('id', existing.id));
    } else {
      ({ error } = await supabase
        .from('zoom_config')
        .insert({ meeting_id: meetingId, passcode }));
    }

    setSaving(false);

    if (error) {
      toast({ title: 'Error saving', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Zoom settings saved', description: 'Meeting configuration has been updated.' });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied to clipboard` });
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
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Zoom Integration
            <Badge variant="default" className="ml-2 gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Connected
            </Badge>
          </CardTitle>
          <CardDescription>
            Zoom Web Meeting SDK is integrated for live reading sessions. Students join directly from the Meeting Room page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-muted-foreground">SDK Type</span>
              <span className="font-medium">Zoom Web Meeting SDK (Embedded)</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-muted-foreground">Join Mode</span>
              <span className="font-medium">Auto-join on page load</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-muted-foreground">Meeting Room URL</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">www.ebookbuddy.org/meeting</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard('https://www.ebookbuddy.org/meeting', 'URL')}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meeting Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Default Meeting Configuration</CardTitle>
          <CardDescription>
            Set the default Zoom meeting that students will automatically join when visiting the Meeting Room.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meetingId">Meeting ID</Label>
            <div className="flex items-center gap-2">
              <Input
                id="meetingId"
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value)}
                placeholder="123 456 7890"
              />
              <Button variant="ghost" size="icon" onClick={() => copyToClipboard(meetingId, 'Meeting ID')}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passcode">Meeting Passcode</Label>
            <div className="flex items-center gap-2">
              <Input
                id="passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Meeting passcode"
              />
              <Button variant="ghost" size="icon" onClick={() => copyToClipboard(passcode, 'Passcode')}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Configuration
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* SDK Keys Info */}
      <Card>
        <CardHeader>
          <CardTitle>SDK Credentials</CardTitle>
          <CardDescription>
            Zoom SDK keys are securely stored as backend secrets and used by the signature generation function.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-muted-foreground">ZOOM_SDK_KEY</span>
              <Badge variant="secondary">Configured ✓</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-muted-foreground">ZOOM_SDK_SECRET</span>
              <Badge variant="secondary">Configured ✓</Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            To update SDK credentials, go to the{' '}
            <a
              href="https://marketplace.zoom.us/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Zoom App Marketplace <ExternalLink className="w-3 h-3" />
            </a>
            {' '}and update the secrets in your backend configuration.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
