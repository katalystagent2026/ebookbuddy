import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Video, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ZoomMeetingFrame from "@/components/ZoomMeetingFrame";

const MeetingRoom = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userName, setUserName] = useState("");
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (user) {
      const displayName =
        user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
      setUserName(displayName);
    }
  }, [user]);

  // Confirm there is an active meeting configured (credentials come from the edge function)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: account } = await supabase
        .from("zoom_accounts")
        .select("meeting_id")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (account?.meeting_id) {
        setMeetingId(account.meeting_id);
        setIsChecking(false);
        return;
      }

      const { data } = await supabase
        .from("zoom_config")
        .select("meeting_id")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setMeetingId(data?.meeting_id ?? null);
      setIsChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const ready = Boolean(meetingId && userName);

  return (
    <div className="min-h-screen bg-gradient-warm">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="safe-container py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-heading font-bold text-foreground">Meeting Room</h1>
          </div>
        </div>
      </header>

      <main className="safe-container py-8">
        {isChecking && (
          <Card className="max-w-md mx-auto mb-8">
            <CardContent className="pt-6 flex items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Preparing your meeting room…</p>
            </CardContent>
          </Card>
        )}

        {!isChecking && !meetingId && (
          <Card className="max-w-md mx-auto mb-8">
            <CardContent className="pt-6 text-center">
              <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-heading font-semibold text-muted-foreground mb-2">
                No Active Meeting
              </h3>
              <p className="text-sm text-muted-foreground">
                There is no active Zoom meeting configured. Please contact an administrator.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="h-full min-h-[600px]">
          <CardContent className="p-0 h-full">
            {ready ? (
              <ZoomMeetingFrame userName={userName} />
            ) : (
              <div className="w-full h-full min-h-[600px] rounded-lg bg-muted" />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MeetingRoom;
