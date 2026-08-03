import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Video, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const MeetingRoom = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [meetingId, setMeetingId] = useState("");
  const [passcode, setPasscode] = useState("");
  const [userName, setUserName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSdkLoading, setIsSdkLoading] = useState(true);
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [hasAutoJoined, setHasAutoJoined] = useState(false);
  const meetingContainerRef = useRef<HTMLDivElement>(null);
  const zoomClientRef = useRef<any>(null);

  // Set userName from logged-in user
  useEffect(() => {
    if (user) {
      const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
      setUserName(displayName);
    }
  }, [user]);

  // Load meeting credentials from the protected config tables (auth required by RLS)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: account } = await supabase
        .from("zoom_accounts")
        .select("meeting_id, passcode")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (account?.meeting_id) {
        setMeetingId(account.meeting_id);
        setPasscode(account.passcode ?? "");
        return;
      }

      const { data } = await supabase
        .from("zoom_config")
        .select("meeting_id, passcode")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !data) return;
      setMeetingId(data.meeting_id ?? "");
      setPasscode(data.passcode ?? "");
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);



  useEffect(() => {
    // Pre-load the Zoom SDK
    const loadZoomSdk = async () => {
      try {
        const ZoomMtgEmbedded = (await import("@zoom/meetingsdk/embedded")).default;
        zoomClientRef.current = ZoomMtgEmbedded.createClient();
        setIsSdkLoading(false);
      } catch (error) {
        console.error("Failed to load Zoom SDK:", error);
        toast.error("Failed to load Zoom SDK. Please refresh the page.");
        setIsSdkLoading(false);
      }
    };

    loadZoomSdk();

    return () => {
      // Cleanup on unmount
      if (zoomClientRef.current) {
        try {
          zoomClientRef.current.endMeeting();
        } catch {
          // Meeting might not be active
        }
      }
    };
  }, []);

  // Auto-join meeting when SDK is ready and user details are set
  useEffect(() => {
    if (!isSdkLoading && userName && meetingId && !isInMeeting && !isLoading && !hasAutoJoined && zoomClientRef.current) {
      setHasAutoJoined(true);
      handleJoinMeeting();
    }
  }, [isSdkLoading, userName, meetingId, isInMeeting, isLoading, hasAutoJoined]);

  const handleJoinMeeting = async () => {
    if (!meetingId || !userName) {
      toast.error("Please enter meeting ID and your name");
      return;
    }

    if (!zoomClientRef.current) {
      toast.error("Zoom SDK not loaded. Please refresh the page.");
      return;
    }

    setIsLoading(true);

    try {
      // Get signature from edge function
      const { data: signatureData, error: signatureError } = await supabase.functions.invoke(
        "zoom-signature",
        {
          body: {
            meetingNumber: meetingId.replace(/\s/g, ""),
            role: 0, // 0 for attendee, 1 for host
          },
        }
      );

      if (signatureError || !signatureData?.signature) {
        throw new Error(signatureError?.message || "Failed to generate meeting signature");
      }

      // Initialize the Zoom client
      if (meetingContainerRef.current) {
        await zoomClientRef.current.init({
          zoomAppRoot: meetingContainerRef.current,
          language: "en-US",
          patchJsMedia: true,
          leaveOnPageUnload: true,
        });

        // Join the meeting
        await zoomClientRef.current.join({
          signature: signatureData.signature,
          sdkKey: signatureData.sdkKey,
          meetingNumber: String(signatureData.meetingNumber),
          password: signatureData.passcode ?? passcode,
          userName: userName,
        });


        setIsInMeeting(true);
        toast.success("Successfully joined the meeting!");
      }
    } catch (error: any) {
      console.error("Failed to join meeting:", error);
      toast.error(error.message || "Failed to join meeting. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-warm">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="safe-container py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-heading font-bold text-foreground">
              Meeting Room
            </h1>
          </div>
        </div>
      </header>

      <main className="safe-container py-8">
        {/* SDK Loading State */}
        {isSdkLoading && (
          <Card className="max-w-md mx-auto mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Loading Zoom SDK components...
              </p>
            </CardContent>
          </Card>
        )}

        {!isSdkLoading && !meetingId && (
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

        {/* Meeting Container */}
        <Card className="h-full min-h-[600px]">
          <CardContent className="p-0 h-full">
            <div
              ref={meetingContainerRef}
              id="zoom-meeting-container"
              className="w-full h-full min-h-[600px] rounded-lg overflow-hidden bg-muted flex items-center justify-center"
            >
              {!isInMeeting && meetingId && (
                <div className="text-center p-8">
                  <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-heading font-semibold text-foreground mb-2">
                    Joining Meeting...
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Please wait while we connect you to the video call
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MeetingRoom;
