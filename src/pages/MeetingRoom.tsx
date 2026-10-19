import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Video, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ZoomMeetingFrame from "@/components/ZoomMeetingFrame";
import JitsiMeetingFrame from "@/components/JitsiMeetingFrame";

type MeetingMode = "assigned" | "zoom" | "jitsi";

const PROVIDER_LABEL = { zoom: "Zoom", jitsi: "Jitsi" } as const;

interface MeetingRoomProps {
  /**
   * "assigned" (/meeting) opens the setup an admin assigned to this volunteer.
   * "zoom" (/zoom) and "jitsi" (/meet) open the active setup of that provider.
   */
  mode?: MeetingMode;
}

const MeetingRoom = ({ mode = "assigned" }: MeetingRoomProps) => {
  const navigate = useNavigate();
  const { user, role, isAdmin } = useAuth();
  const [userName, setUserName] = useState("");
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [provider, setProvider] = useState<"zoom" | "jitsi">("zoom");
  const [setup, setSetup] = useState<{ id: string; name: string } | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [notice, setNotice] = useState("There is no active meeting room right now. Please contact an administrator.");
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

  // Pick the meeting setup for this page (credentials come from the edge functions)
  useEffect(() => {
    if (!user || role === null) return;
    let cancelled = false;
    (async () => {
      const [{ data: setups }, { data: profile }] = await Promise.all([
        supabase.from("zoom_accounts").select("id, name, is_active, video_provider"),
        supabase.from("profiles").select("zoom_account_id").eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;

      const active = (setups ?? []).filter((s) => s.is_active);
      const assigned = active.find((s) => s.id === profile?.zoom_account_id) ?? null;
      const ofProvider = (p: "zoom" | "jitsi") => active.find((s) => s.video_provider === p) ?? null;

      let chosen: typeof assigned = null;
      if (mode === "assigned") {
        // Admins without an assignment can still get in; prefer Zoom when both are active.
        chosen = assigned ?? (isAdmin ? ofProvider("zoom") ?? ofProvider("jitsi") : null);
        if (!chosen) setNotice("You're not assigned to an active meeting room yet. Please contact an administrator.");
      } else if (!ofProvider(mode)) {
        setNotice(`The ${PROVIDER_LABEL[mode]} meeting room isn't active right now. Please contact an administrator.`);
      } else if (isAdmin) {
        chosen = ofProvider(mode);
      } else if (assigned?.video_provider === mode) {
        chosen = assigned;
      } else {
        setNotice(`You're assigned to a different meeting room. Use the Online Meeting Room button on your dashboard.`);
      }

      if (chosen) {
        const chosenProvider = chosen.video_provider === "jitsi" ? "jitsi" : "zoom";
        console.log("[MeetingRoom] mode:", mode, "-> using provider:", chosenProvider);
        setSetup({ id: chosen.id, name: chosen.name || "" });
        setProvider(chosenProvider);
        setMeetingId(chosen.id);
      }
      setIsChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, role, isAdmin, mode]);

  const ready = Boolean(meetingId && userName);

  // Track this user's session (entry, exit, duration, errors)
  useEffect(() => {
    if (!ready || !user || !setup) return;

    let closed = false;
    const errors: string[] = [];
    const enteredAt = new Date();

    const onError = (e: ErrorEvent) => {
      if (errors.length < 5) errors.push(e.message);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      if (errors.length < 5) errors.push(String((e.reason as any)?.message ?? e.reason));
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    const closeSession = () => {
      const id = sessionIdRef.current;
      if (closed || !id) return;
      closed = true;
      const exitedAt = new Date();
      const minutes = Math.max(0, Math.round((exitedAt.getTime() - enteredAt.getTime()) / 60000));
      supabase
        .from("meeting_sessions")
        .update({
          exited_at: exitedAt.toISOString(),
          duration_minutes: minutes,
          error_log: errors.length ? errors.join(" | ").slice(0, 1000) : null,
        })
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("[MeetingRoom] failed to close session record", error);
        });
    };

    (async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const list = (roles || []).map((r: any) => r.role as string);
      const role =
        ["admin", "staff", "volunteer", "student"].find((r) => list.includes(r)) || list[0] || "user";

      const { data, error } = await supabase
        .from("meeting_sessions")
        .insert({
          zoom_account_id: setup.id,
          session_name: setup.name,
          video_provider: provider,
          user_id: user.id,
          user_name: userName,
          user_email: user.email || "",
          user_role: role,
          entered_at: enteredAt.toISOString(),
        })
        .select("id")
        .maybeSingle();

      if (error) {
        console.error("[MeetingRoom] failed to create session record", error);
        return;
      }
      if (closed) {
        // component unmounted before the insert finished — close immediately
        sessionIdRef.current = data?.id ?? null;
        closed = false;
        closeSession();
        return;
      }
      sessionIdRef.current = data?.id ?? null;
    })();

    window.addEventListener("pagehide", closeSession);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("pagehide", closeSession);
      closeSession();
      sessionIdRef.current = null;
    };
  }, [ready, user, setup, provider, userName]);



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
                Meeting Room Unavailable
              </h3>
              <p className="text-sm text-muted-foreground">
                {notice}
              </p>
            </CardContent>
          </Card>
        )}

        <Card ref={cardRef} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">

            {ready ? (
              provider === "jitsi" ? (
                (console.log("[MeetingRoom] rendering JitsiMeetingFrame (no zoom-signature call)"),
                <JitsiMeetingFrame userName={userName} setupId={setup?.id ?? ""} />)
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
