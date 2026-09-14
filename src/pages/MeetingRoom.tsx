import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Video, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ZoomMeetingFrame from "@/components/ZoomMeetingFrame";
import JitsiMeetingFrame from "@/components/JitsiMeetingFrame";

const MeetingRoom = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userName, setUserName] = useState("");
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [provider, setProvider] = useState<"zoom" | "jitsi">("zoom");
  const [jitsiRoom, setJitsiRoom] = useState("");
  const [setup, setSetup] = useState<{ id: string; name: string } | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const headerRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [meetingHeight, setMeetingHeight] = useState(() => Math.max(320, window.innerHeight - 72));
  // Exact usable pixel height for the video frame (main padding + card border removed).
  const [frameHeight, setFrameHeight] = useState(() => Math.max(280, window.innerHeight - 72 - 34));


  useEffect(() => {
    let frame = 0;
    const updateHeight = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        const headerHeight = Math.ceil(headerRef.current?.getBoundingClientRect().height ?? 72);
        const viewport = Math.floor(window.visualViewport?.height || window.innerHeight);
        const available = Math.max(320, viewport - headerHeight);
        setMeetingHeight(available);

        const cardTop = cardRef.current?.getBoundingClientRect().top;
        const inner =
          typeof cardTop === "number"
            ? Math.floor(viewport - cardTop - 2) // 2px card border
            : available - (window.innerWidth >= 640 ? 34 : 18);
        setFrameHeight(Math.max(280, Math.min(inner, available)));
      });
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    window.addEventListener("orientationchange", updateHeight);
    window.visualViewport?.addEventListener("resize", updateHeight);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateHeight);
      window.removeEventListener("orientationchange", updateHeight);
      window.visualViewport?.removeEventListener("resize", updateHeight);
    };
  }, []);

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
        .select("id, name, meeting_id, video_provider, jitsi_room_name")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if ((account as any)?.id) {
        setSetup({ id: (account as any).id, name: (account as any).name || "" });
      }

      const activeProvider = (account as any)?.video_provider === "jitsi" ? "jitsi" : "zoom";
      console.log("[MeetingRoom] active setup video_provider:", (account as any)?.video_provider, "-> using:", activeProvider);
      setProvider(activeProvider);

      if (activeProvider === "jitsi") {
        const room = ((account as any)?.jitsi_room_name || "").trim();
        setJitsiRoom(room);
        setMeetingId(room || null);
        setIsChecking(false);
        return;
      }

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
    <div className="h-screen h-[100dvh] overflow-hidden flex flex-col bg-gradient-warm">
      <header ref={headerRef} className="border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
        <div className="safe-container py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <Video className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            <h1 className="text-base sm:text-xl font-heading font-bold text-foreground truncate">
              Meeting Room
            </h1>
          </div>
        </div>
      </header>

      <main
        className="safe-container w-full min-h-0 flex flex-col px-2 sm:px-4 py-2 sm:py-4 gap-3 sm:gap-4 overflow-hidden"
        style={{
          height: `${meetingHeight}px`,
          maxHeight: `${meetingHeight}px`,
        }}
      >

        {isChecking && (
          <Card className="max-w-md mx-auto shrink-0">
            <CardContent className="pt-6 flex items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Preparing your meeting room…</p>
            </CardContent>
          </Card>
        )}

        {!isChecking && !meetingId && (
          <Card className="max-w-md mx-auto shrink-0">
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

        <Card ref={cardRef} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">

            {ready ? (
              provider === "jitsi" ? (
                (console.log("[MeetingRoom] rendering JitsiMeetingFrame (no zoom-signature call), room:", jitsiRoom),
                <JitsiMeetingFrame userName={userName} roomName={jitsiRoom} />)
              ) : (
                (console.log("[MeetingRoom] rendering ZoomMeetingFrame (Client View)"),
                <ZoomMeetingFrame userName={userName} userEmail={user?.email} />)
              )
            ) : (
              <div className="flex-1 min-h-0 w-full rounded-lg bg-muted" />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );

};

export default MeetingRoom;
