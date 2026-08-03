import { memo, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const cleanupResizeRef = useRef<(() => void) | null>(null);
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const leftRef = useRef(false);



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

        const measure = () => {
          const el = containerRef.current;
          const rect = el?.getBoundingClientRect();
          const width = Math.floor(rect?.width || el?.clientWidth || window.innerWidth);
          const height = Math.floor(rect?.height || el?.clientHeight || window.innerHeight);
          // Never exceed the container: Zoom sizes its canvas from these values,
          // and an oversized value causes clipping/overflow on small screens.
          return {
            width: Math.max(240, width),
            height: Math.max(180, height),
          };
        };
        const size = measure();
        const ribbonWidth = (h: number, w: number) => ({
          width: Math.min(300, Math.max(120, Math.floor(w * 0.35))),
          height: h,
        });

        await client.init({
          zoomAppRoot: containerRef.current,
          language: "en-US",
          patchJsMedia: true,
          leaveOnPageUnload: true,
          customize: {
            video: {
              isResizable: true,
              popper: { disableDraggable: true },
              viewSizes: { default: size, ribbon: ribbonWidth(size.height, size.width) },
            },
          },
        } as any);
        if (disposed) return;

        // Keep Zoom's gallery/video view in sync with the container size across
        // window resizes, orientation changes, and layout shifts.
        let frame = 0;
        let last = { width: 0, height: 0 };
        const applySize = () => {
          if (disposed) return;
          const next = measure();
          if (next.width === last.width && next.height === last.height) return;
          last = next;
          try {
            (clientRef.current as any)?.updateVideoOptionsViewSizes?.({
              default: next,
              ribbon: ribbonWidth(next.height, next.width),
            });
          } catch {
            // SDK not ready yet
          }
        };
        const scheduleApply = () => {
          if (frame) cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => {
            frame = 0;
            applySize();
          });
        };
        cleanupResizeRef.current = () => {
          if (frame) cancelAnimationFrame(frame);
          window.removeEventListener("resize", scheduleApply);
          window.removeEventListener("orientationchange", onOrientation);
          window.visualViewport?.removeEventListener("resize", scheduleApply);
        };
        // Orientation change reports stale sizes for a beat on mobile browsers.
        const onOrientation = () => {
          scheduleApply();
          setTimeout(scheduleApply, 250);
          setTimeout(scheduleApply, 600);
        };
        window.addEventListener("resize", scheduleApply);
        window.addEventListener("orientationchange", onOrientation);
        window.visualViewport?.addEventListener("resize", scheduleApply);

        resizeObserverRef.current = new ResizeObserver(() => scheduleApply());
        resizeObserverRef.current.observe(containerRef.current);



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
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      cleanupResizeRef.current?.();
      cleanupResizeRef.current = null;

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
    <div className="relative w-full h-full min-h-0 flex-1">
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
        className="absolute inset-0 w-full h-full rounded-lg overflow-hidden"
      />
    </div>

  );
};

// Memoized with a constant comparator: after mount this never re-renders.
export const ZoomMeetingFrame = memo(ZoomMeetingFrameBase, () => true);

export default ZoomMeetingFrame;
