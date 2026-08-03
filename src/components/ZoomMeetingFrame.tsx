import { memo, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ZoomMeetingFrameProps {
  userName: string;
  userEmail?: string;
}

const ZOOM_BODY_CLASS = "zoom-client-active";

/**
 * Zoom Client View host.
 *
 * Client View has no container/sizing API: the SDK injects `#zmmtg-root` and
 * `#aria-notify-area` straight into <body> and owns the whole viewport. This
 * component therefore renders no mount node at all — it only bootstraps the
 * SDK, toggles the body class that reveals `#zmmtg-root` (see index.css), and
 * shows a lightweight overlay until Zoom's own UI takes over.
 */
const ZoomMeetingFrameBase = ({ userName, userEmail }: ZoomMeetingFrameProps) => {
  const startedRef = useRef(false);
  const joinedRef = useRef(false);
  const sdkRef = useRef<any>(null);

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
        if (disposed) return;

        const { ZoomMtg } = await import("@zoom/meetingsdk");
        if (disposed) return;
        sdkRef.current = ZoomMtg;

        // Required Client View bootstrap, in this exact order.
        ZoomMtg.preLoadWasm();
        ZoomMtg.prepareWebSDK();

        // Zoom paints its UI into #zmmtg-root; reveal it only now.
        document.body.classList.add(ZOOM_BODY_CLASS);

        await new Promise<void>((resolve, reject) => {
          ZoomMtg.init({
            // Client View redirects here natively when the user leaves or the
            // meeting ends — no custom leave-event listeners needed.
            leaveUrl: `${window.location.origin}/dashboard`,
            patchJsMedia: true,
            disableInvite: true,
            isSupportAV: true,
            success: () => resolve(),
            error: (err: any) => reject(new Error(err?.reason || err?.message || "Zoom init failed")),
          } as any);
        });
        if (disposed) return;

        await new Promise<void>((resolve, reject) => {
          ZoomMtg.join({
            signature: signatureData.signature,
            // Client View still uses `sdkKey`; the edge function returns both.
            sdkKey: signatureData.appKey ?? signatureData.sdkKey,
            meetingNumber: String(signatureData.meetingNumber),
            // NOTE: capital W — Client View naming, unlike Component View.
            passWord: signatureData.passcode ?? "",
            userName,
            userEmail: userEmail ?? "",
            success: () => resolve(),
            error: (err: any) => reject(new Error(err?.reason || err?.message || "Zoom join failed")),
          } as any);
        });

        joinedRef.current = true;
        if (disposed) return;
        console.log("[Zoom] joined meeting (Client View)");

        // TEMP DIAGNOSTIC: verify clicks reach Zoom's toolbar handlers and log
        // whichever element is actually topmost at the click point.
        const clickProbe = (event: MouseEvent) => {
          const target = event.target as HTMLElement | null;
          const topmost = document.elementFromPoint(event.clientX, event.clientY);
          console.log("[Zoom][click-probe]", {
            target: target?.className,
            label: target?.closest("[aria-label]")?.getAttribute("aria-label"),
            topmost: (topmost as HTMLElement | null)?.className,
            insideZoomRoot: Boolean(target?.closest("#zmmtg-root")),
            defaultPrevented: event.defaultPrevented,
          });
        };
        document.addEventListener("click", clickProbe, true);
        cleanupProbeRef.current = () => document.removeEventListener("click", clickProbe, true);

        setStatus("joined");
        toast.success("Successfully joined the meeting!");

      } catch (error: any) {
        console.error("[Zoom] failed to join meeting:", error);
        document.body.classList.remove(ZOOM_BODY_CLASS);
        if (disposed) return;
        setStatus("error");
        setMessage(error?.message || "Failed to join meeting. Please try again.");
        toast.error(error?.message || "Failed to join meeting.");
      }
    })();

    return () => {
      disposed = true;
      document.body.classList.remove(ZOOM_BODY_CLASS);

      const ZoomMtg = sdkRef.current;
      sdkRef.current = null;
      if (!ZoomMtg) return;
      try {
        if (joinedRef.current) ZoomMtg.leaveMeeting({});
      } catch {
        // meeting may already be over
      }
      joinedRef.current = false;
      // Zoom leaves its root in <body>; drop it so it can never cover other routes.
      try {
        document.getElementById("zmmtg-root")?.remove();
        document.getElementById("aria-notify-area")?.remove();
      } catch {
        // no-op
      }
    };
    // Intentionally empty: this component must never re-run after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "joined") return null;

  return (
    <div className="relative w-full flex-1 min-h-0 flex items-center justify-center bg-muted rounded-lg">
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
  );
};

// Props are stable for the lifetime of the meeting; never re-render.
export const ZoomMeetingFrame = memo(ZoomMeetingFrameBase, () => true);

export default ZoomMeetingFrame;
