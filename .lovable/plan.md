# Migrate Zoom embed to Client View

Replace the Component View embed (mounted inside our page) with Zoom's full-page Client View, which takes over the browser tab while a meeting is active and removes all the container-sizing work we've been fighting.

## What changes for the user

- Clicking into the meeting room shows Zoom's own full-screen meeting UI (its native toolbar, gallery, chat), not a boxed widget inside our card.
- No more page scrollbars or clipped toolbar — Zoom owns the viewport for the duration of the meeting.
- Leaving the meeting returns the user to the dashboard, handled natively by Zoom.
- Jitsi rooms are unaffected and keep the current embedded behaviour.

## Implementation

### 1. Rewrite `src/components/ZoomMeetingFrame.tsx`
- Import `ZoomMtg` from `@zoom/meetingsdk` (Client View) instead of `@zoom/meetingsdk/embedded`.
- Bootstrap once on mount, guarded by a ref against StrictMode double-invoke:
  `ZoomMtg.preLoadWasm()` → `ZoomMtg.prepareWebSDK()` → `ZoomMtg.init({ leaveUrl: \`${window.location.origin}/dashboard\`, patchJsMedia: true, ... })` → `ZoomMtg.join({...})`.
- Drop `containerRef`/`zoomAppRoot`, the `ResizeObserver`, `measure`/`boxSize`/`clampZoomRoot`, `updateVideoOptions`, `setViewType`, and the `availableHeight` prop — Client View has no sizing API and injects `#zmmtg-root` into `<body>`.
- Drop the custom leave-event listeners and `navigate()` redirect; `leaveUrl` handles it. Keep a minimal set of console logs for join success/failure.
- Keep the loading/error overlay only until Zoom's UI appears.
- On unmount: `ZoomMtg.leaveMeeting({})` if joined, then `ZoomMtg.endMeeting`/root cleanup, and hide `#zmmtg-root` so it can't linger over other routes.

### 2. Field naming for the join call
`ZoomMtg.join` expects `passWord` (capital W), `sdkKey`, `signature`, `meetingNumber`, `userName`, `userEmail`. The `zoom-signature` edge function already returns `signature`, `appKey`, `sdkKey`, `meetingNumber`, `passcode` — no edge-function change needed; the client maps `passcode` → `passWord` and `appKey ?? sdkKey` → `sdkKey`.

### 3. Full-viewport CSS
Add to `src/index.css`:

```text
#zmmtg-root { display: none; }
body.zoom-client-active #zmmtg-root {
  display: block; position: fixed; inset: 0;
  width: 100vw; height: 100vh; z-index: 9999;
}
```

The component toggles `zoom-client-active` on `<body>` while a meeting is live and removes it on unmount. Keeping `#zmmtg-root` hidden by default is what prevents Zoom's injected root from covering the rest of the app after leaving.

### 4. Simplify `src/pages/MeetingRoom.tsx`
- Stop computing and passing `frameHeight` to the Zoom branch (`meetingHeight`/`cardRef` logic stays only for the Jitsi branch).
- For the Zoom branch, render `ZoomMeetingFrame` without the card chrome, since Zoom covers the page anyway.

### 5. Style-bleed check (item 7)
Zoom's Client View bundle ships global CSS (`bootstrap`-derived resets) that it injects on load. After the change, verify with a headless pass: load `/dashboard` and the landing page after a Zoom session mounts, and confirm header, buttons, and Tailwind typography are unchanged. If bleed appears, scope the damage by only importing Zoom's CSS at meeting time and removing `#zmmtg-root` from the DOM on unmount.

## Notes and tradeoffs

- Client View cannot be visually embedded inside our layout — no custom header alongside the meeting. This is the accepted tradeoff for stable sizing.
- The signature payload is identical for both views, so no JWT changes.
- The 2-participant Gallery View check still needs a live second attendee to fully confirm on your side.
