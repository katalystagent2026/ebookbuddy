import { memo, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface JitsiMeetingFrameProps {
  userName: string;
  roomName: string;
}

const JITSI_DOMAIN = "meet.jit.si";
const SCRIPT_SRC = `https://${JITSI_DOMAIN}/external_api.js`;

/** Counts every mount of this component for debugging remount loops. */
let mountCount = 0;
/** Guards against a second JitsiMeetExternalAPI instance for the same room. */
let activeInstance: { room: string; api: any } | null = null;

const loadJitsiScript = () =>
  new Promise<void>((resolve, reject) => {
    if ((window as any).JitsiMeetExternalAPI) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Jitsi Meet")));
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Jitsi Meet"));
    document.body.appendChild(script);
  });

/**
 * Isolated Jitsi host. Same contract as ZoomMeetingFrame: the container node is
 * mounted once, React never reconciles its children, and the external API owns
 * everything inside it.
 */
const JitsiMeetingFrameBase = ({ userName, roomName }: JitsiMeetingFrameProps) => {
  mountCount += 1;
  console.log(`[Jitsi] component mounting/initializing (render/mount #${mountCount})`, { roomName });

  const containerRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const [status, setStatus] = useState<"loading" | "joined" | "error">("loading");
  const [message, setMessage] = useState("Connecting you to the video call…");

  useEffect(() => {
    if (startedRef.current) {
      console.log("[Jitsi] effect re-ran but init already started — skipping");
      return;
    }
    startedRef.current = true;

    // A previous instance for this same room is still alive (fast remount /
    // StrictMode double-invoke). Re-attach instead of re-initializing.
    if (activeInstance && activeInstance.room === roomName && containerRef.current) {
      const iframe = activeInstance.api.getIFrame?.();
      if (iframe && containerRef.current !== iframe.parentNode) {
        console.log("[Jitsi] re-attaching existing iframe, no re-init");
        containerRef.current.appendChild(iframe);
      }
      setStatus("joined");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        if (!roomName) throw new Error("No meeting room configured. Please contact an administrator.");
        await loadJitsiScript();
        if (cancelled || !containerRef.current) return;

        const JitsiMeetExternalAPI = (window as any).JitsiMeetExternalAPI;
        if (!JitsiMeetExternalAPI) throw new Error("Jitsi Meet failed to initialize");

        console.log("[Jitsi] creating JitsiMeetExternalAPI (once)", { roomName });
        const api = new JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName,
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          userInfo: { displayName: userName },
          configOverwrite: { prejoinPageEnabled: false },
        });
        activeInstance = { room: roomName, api };

        api.addEventListener("videoConferenceJoined", () => {
          console.log("[Jitsi] videoConferenceJoined fired");
          setStatus("joined");
        });
        const leave = () => {
          try {
            api.dispose?.();
          } catch {
            // already disposed
          }
          if (activeInstance?.api === api) activeInstance = null;
          navigateRef.current("/dashboard");
        };
        api.addEventListener("videoConferenceLeft", leave);
        api.addEventListener("readyToClose", leave);
      } catch (error: any) {
        if (cancelled) return;
        setStatus("error");
        setMessage(error?.message || "Something went wrong joining the meeting.");
      }
    })();

    return () => {
      cancelled = true;
      // Defer teardown so a synchronous remount (StrictMode / parent churn)
      // can re-attach the same instance instead of restarting the join flow.
      const api = activeInstance?.api;
      setTimeout(() => {
        if (!api || activeInstance?.api !== api) return;
        const iframe = api.getIFrame?.();
        if (iframe && document.body.contains(iframe)) return; // re-attached, keep alive
        console.log("[Jitsi] disposing instance");
        try {
          api.dispose?.();
        } catch {
          // already disposed
        }
        activeInstance = null;
      }, 300);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="relative w-full h-full flex-1 min-h-0 overflow-hidden"
      style={{ height: "100%", maxHeight: "100%" }}
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
      {/* Jitsi owns this node. Never render React children inside it. */}
      <div
        ref={containerRef}
        id="jitsi-meeting-container"
        className="absolute inset-0 min-h-0 rounded-lg overflow-hidden"
        style={{ width: "100%", height: "100%", maxHeight: "100%" }}
      />
    </div>
  );
};

export const JitsiMeetingFrame = memo(JitsiMeetingFrameBase, () => true);

export default JitsiMeetingFrame;
