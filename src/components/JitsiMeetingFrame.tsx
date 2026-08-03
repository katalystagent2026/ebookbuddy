import { memo, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface JitsiMeetingFrameProps {
  userName: string;
  roomName: string;
}

const JITSI_DOMAIN = "meet.jit.si";
const SCRIPT_SRC = `https://${JITSI_DOMAIN}/external_api.js`;

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
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const startedRef = useRef(false);
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const [status, setStatus] = useState<"loading" | "joined" | "error">("loading");
  const [message, setMessage] = useState("Connecting you to the video call…");

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let disposed = false;

    (async () => {
      try {
        if (!roomName) throw new Error("No meeting room configured. Please contact an administrator.");
        await loadJitsiScript();
        if (disposed || !containerRef.current) return;

        const JitsiMeetExternalAPI = (window as any).JitsiMeetExternalAPI;
        if (!JitsiMeetExternalAPI) throw new Error("Jitsi Meet failed to initialize");

        const api = new JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName,
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          userInfo: { displayName: userName },
          configOverwrite: { prejoinPageEnabled: false },
        });
        apiRef.current = api;

        api.addEventListener("videoConferenceJoined", () => {
          console.log("[Jitsi] videoConferenceJoined fired");
          setStatus("joined");
        });
        const leave = () => navigateRef.current("/dashboard");
        api.addEventListener("videoConferenceLeft", leave);
        api.addEventListener("readyToClose", leave);
      } catch (error: any) {
        if (disposed) return;
        setStatus("error");
        setMessage(error?.message || "Something went wrong joining the meeting.");
      }
    })();

    return () => {
      disposed = true;
      try {
        apiRef.current?.dispose?.();
      } catch {
        // already disposed
      }
      apiRef.current = null;
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
