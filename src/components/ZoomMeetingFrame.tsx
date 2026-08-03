import { memo, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ZoomMeetingFrameProps {
  userName: string;
}

/**
 * Isolated Zoom SDK host.
 *
 * The container div is mounted exactly once and React never re-renders it
 * (the component is memoized and the container is rendered outside of any
 * state-dependent JSX). Zoom owns everything inside that node, so React must
 * never try to reconcile its children — otherwise we get
 * "NotFoundError: Failed to execute 'removeChild' on 'Node'".
 */
const ZoomMeetingFrameBase = ({ userName }: ZoomMeetingFrameProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<any>(null);
  const startedRef = useRef(false);
  const joinedRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "joined" | "error">("loading");
  const [message, setMessage] = useState("Connecting you to the video call…");

  useEffect(() => {
    // Guard against React StrictMode double-invoking effects in development.
    if (startedRef.current) return;
    startedRef.current = true;

    let disposed = false;

    (async () => {
      try {
        const { data: signatureData, error: signatureError } =
          await supabase.functions.invoke("zoom-signature", { body: { role: 0 } });

        if (signatureError || !signatureData?.signature) {
          throw new Error(signatureError?.message || "Failed to generate meeting signature");
        }
        if (disposed || !containerRef.current) return;

        const ZoomMtgEmbedded = (await import("@zoom/meetingsdk/embedded")).default;
        if (disposed || !containerRef.current) return;

        const client = ZoomMtgEmbedded.createClient();
        clientRef.current = client;

        await client.init({
          zoomAppRoot: containerRef.current,
          language: "en-US",
          patchJsMedia: true,
          leaveOnPageUnload: true,
        });
        if (disposed) return;

        await client.join({
          signature: signatureData.signature,
          // Zoom now expects `appKey`; typings still reference the deprecated `sdkKey`.
          appKey: signatureData.appKey ?? signatureData.sdkKey,
          meetingNumber: String(signatureData.meetingNumber),
          password: signatureData.passcode ?? "",
          userName,
        } as any);


        joinedRef.current = true;
        if (disposed) return;
        setStatus("joined");
        toast.success("Successfully joined the meeting!");
      } catch (error: any) {
        console.error("Failed to join meeting:", error);
        if (disposed) return;
        setStatus("error");
        setMessage(error?.message || "Failed to join meeting. Please try again.");
        toast.error(error?.message || "Failed to join meeting.");
      }
    })();

    return () => {
      disposed = true;
      const client = clientRef.current;
      clientRef.current = null;
      if (!client) return;
      // Let Zoom tear down its own DOM before React unmounts the container.
      try {
        if (joinedRef.current) client.leaveMeeting();
      } catch {
        // meeting may already be over
      }
      try {
        client.destroyClient?.();
      } catch {
        // no-op
      }
    };
    // Intentionally empty: this component must never re-run after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full h-full min-h-[600px]">
      {status !== "joined" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted rounded-lg pointer-events-none">
          <div className="text-center p-8">
            {status === "loading" && (
              <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
            )}
            <h3 className="text-lg font-heading font-semibold text-foreground mb-2">
              {status === "loading" ? "Joining Meeting…" : "Unable to join"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
          </div>
        </div>
      )}
      {/* Zoom owns this node. Never render React children inside it. */}
      <div
        ref={containerRef}
        id="zoom-meeting-container"
        className="w-full h-full min-h-[600px] rounded-lg overflow-hidden"
      />
    </div>
  );
};

// Memoized with a constant comparator: after mount this never re-renders.
export const ZoomMeetingFrame = memo(ZoomMeetingFrameBase, () => true);

export default ZoomMeetingFrame;
