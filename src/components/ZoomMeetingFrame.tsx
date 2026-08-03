import { memo, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ZoomMeetingFrameProps {
  userName: string;
  /** Exact usable pixel height handed down by the page (single source of truth). */
  availableHeight?: number;
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
const ZoomMeetingFrameBase = ({ userName, availableHeight }: ZoomMeetingFrameProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<any>(null);
  const startedRef = useRef(false);
  const joinedRef = useRef(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const cleanupResizeRef = useRef<(() => void) | null>(null);
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const leftRef = useRef(false);
  // Always the latest height, readable from the mount-once effect closure.
  const heightRef = useRef(availableHeight);
  heightRef.current = availableHeight;



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

        // Redirect the moment the SDK reports this user left / the meeting ended.
        const handleMeetingEnded = (reason?: string) => {
          if (leftRef.current) return;
          leftRef.current = true;
          joinedRef.current = false;
          console.log("[Zoom] meeting ended for user:", reason);
          navigateRef.current("/dashboard", { replace: true });
        };

        // Log every lifecycle event so the correct one can be identified if a
        // given SDK version renames it.
        const LIFECYCLE_EVENTS = [
          "connection-change",
          "meeting-status",
          "onMeetingStatus",
          "leave-meeting",
          "meeting-ended",
          "closed",
          "user-removed",
        ];
        for (const evt of LIFECYCLE_EVENTS) {
          try {
            client.on(evt as any, (payload: any) => {
              const status =
                payload?.state ?? payload?.meetingStatus ?? payload?.status ?? JSON.stringify(payload ?? {});
              console.log(`[Zoom] leave event fired, status: ${status} (event: ${evt})`);

              const ended =
                status === "Closed" ||
                status === "Fail" ||
                status === "ENDED" ||
                payload?.meetingStatus === 3 ||
                payload?.meetingStatus === 4 ||
                evt === "leave-meeting" ||
                evt === "meeting-ended" ||
                evt === "closed";

              if (ended) handleMeetingEnded(`${evt}:${status}`);
            });
          } catch {
            // event names vary across SDK versions; ignore unsupported ones
          }
        }


        // Zoom renders its control toolbar at the bottom of the root node, so we
        // hand the video view a height that already excludes that strip.
        const TOOLBAR_RESERVE = 68;
        /** Usable box for the SDK: never larger than what's visible below the header. */
        const boxSize = () => {
          const el = wrapperRef.current ?? containerRef.current;
          const rect = el?.getBoundingClientRect();
          const width = Math.floor(rect?.width || el?.clientWidth || window.innerWidth);
          const top = Math.max(0, Math.floor(rect?.top ?? 72));
          const viewport = Math.floor(window.visualViewport?.height || window.innerHeight);
          const visible = Math.max(180, viewport - top);
          const declared = Math.floor(heightRef.current || rect?.height || visible);
          return {
            width: Math.max(240, width),
            height: Math.max(180, Math.min(declared, visible)),
          };
        };
        /** Video-view size = box minus the toolbar strip, so controls stay visible. */
        const measure = () => {
          const box = boxSize();
          return { width: box.width, height: Math.max(180, box.height - TOOLBAR_RESERVE) };
        };
        /** Force the SDK's own root nodes to respect the host box height. */
        const clampZoomRoot = () => {
          const host = containerRef.current;
          if (!host) return;
          const box = boxSize();
          host.style.height = `${box.height}px`;
          host.style.maxHeight = `${box.height}px`;
          host.style.overflow = "hidden";
          const nodes = host.querySelectorAll<HTMLElement>(
            '[class*="MuiPaper-root"], [class*="zoom-app"], [class*="zmwebsdk"]'
          );
          nodes.forEach((node) => {
            node.style.maxHeight = `${box.height}px`;
            node.style.overflow = "hidden";
          });
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
          // Cap gallery tiles: the widget grows past its host box when Zoom
          // tries to lay out a large tile grid inside a short container.
          maximumVideosInGalleryView: 4,
          customize: {
            video: {
              // User-dragged resizing lets the widget escape the host box.
              isResizable: false,
              popper: { disableDraggable: true },
              // NOTE: `defaultViewType` is intentionally NOT set here. It is an
              // init-only option and setting it to "speaker" is a known cause of
              // the control toolbar not rendering at all. We force the view type
              // at runtime with `setViewType` instead (see below).
              viewSizes: { default: size, ribbon: ribbonWidth(size.height, size.width) },
            },
          },
        } as any);
        if (disposed) return;

        // Keep Zoom's gallery/video view in sync with the container size across
        // window resizes, orientation changes, and layout shifts.
        let frame = 0;
        let last = { width: 0, height: 0 };
        const applySize = (force = false) => {
          if (disposed) return;
          const next = measure();
          if (!force && next.width === last.width && next.height === last.height) {
            clampZoomRoot();
            return;
          }
          last = next;
          try {
            // `updateVideoOptions` is the SDK's real re-layout entry point in
            // v5.x (there is no `resize()`, and no `updateVideoOptionsViewSizes`
            // — calling that name was a silent no-op).
            (clientRef.current as any)?.updateVideoOptions?.({
              isResizable: false,
              viewSizes: {
                default: next,
                ribbon: ribbonWidth(next.height, next.width),
              },
            });
          } catch {
            // SDK not ready yet
          }
          // Zoom's documented minimum for Gallery View is 720x411. Below that
          // the SDK lays the tiles out anyway and grows past the host box
          // (pushing the toolbar out of view), so drop back to Speaker View.
          try {
            const fits = next.width >= 720 && next.height >= 411;
            (clientRef.current as any)?.setViewType?.(fits ? "gallery" : "speaker");
          } catch {
            // setViewType is only valid once the meeting is joined
          }
          // The SDK writes its own inline height while re-laying out gallery
          // tiles, so re-assert the host box afterwards.
          clampZoomRoot();
          setTimeout(clampZoomRoot, 150);
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

        // Participant count / view-mode changes make Zoom regrow its layout.
        for (const evt of ["user-added", "user-removed", "user-updated", "video-active-change", "active-speaker"]) {
          try {
            client.on(evt as any, () => {
              applySize(true);
              setTimeout(() => applySize(true), 300);
            });
          } catch {
            // unsupported event name in this SDK version
          }
        }

        resizeObserverRef.current = new ResizeObserver(() => scheduleApply());
        resizeObserverRef.current.observe(wrapperRef.current ?? containerRef.current);
        clampZoomRoot();




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
        applySize(true);
        setTimeout(() => applySize(true), 500);
        setTimeout(() => applySize(true), 1500);
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
    <div
      ref={wrapperRef}
      className="relative w-full flex flex-col"
      style={{
        height: availableHeight ? `${availableHeight}px` : "100%",
        maxHeight: availableHeight ? `${availableHeight}px` : "100%",
        overflow: "hidden",
      }}
    >
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
      {/* Zoom owns this node. Never render React children inside it.
          This is the direct wrapper of the SDK widget: it is clipped so the
          SDK's oversized gallery layout can never push the page taller. */}
      <div
        ref={containerRef}
        id="zoom-meeting-container"
        className="w-full rounded-lg flex flex-col"
        style={{
          width: "100%",
          height: availableHeight ? `${availableHeight}px` : "100%",
          maxHeight: availableHeight ? `${availableHeight}px` : "100%",
          overflow: "hidden",
        }}
      />
    </div>
  );

};

// Re-renders ONLY when the available height changes (styles only — the init
// effect has empty deps, so Zoom is never re-initialized).
export const ZoomMeetingFrame = memo(
  ZoomMeetingFrameBase,
  (prev, next) => prev.availableHeight === next.availableHeight
);

export default ZoomMeetingFrame;
