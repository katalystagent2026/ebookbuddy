## Goal
Zoom's SDK widget (`zoom-MuiPaper-root`) renders taller than its host box (1277px inside a 1110px container) in 2-participant Gallery View, and `overflow: visible` lets it push the page into vertical scroll. Fix: clip at the inner host and drive the SDK to recompute its layout to the real container size.

## Changes

### 1. `src/pages/MeetingRoom.tsx` (outer sizing, single source of truth)
- Keep the JS-computed `meetingHeight` (`window.innerHeight − header height`) but subtract the card/main padding so the number handed down is the true usable pixel height.
- Pass that resolved pixel height down to `ZoomMeetingFrame` as a prop instead of letting the child re-measure the viewport independently (today both compute heights and can disagree).
- Keep `overflow-hidden` on `main` and the `Card`.

### 2. `src/components/ZoomMeetingFrame.tsx`
- Outer wrapper: explicit `height: <prop>px`, `overflow: hidden` (no more `100%`/`visible` mix).
- Inner `#zoom-meeting-container` (the direct wrapper of the SDK widget): switch `overflow: visible` → `overflow: hidden`, with an explicit pixel height equal to the wrapper height. This is the clip boundary requested.
- Reserve the toolbar strip properly: the video view size passed to Zoom = container height − `TOOLBAR_RESERVE` (68px), so the toolbar sits inside the clipped box and is still fully visible rather than being what gets clipped.
- Layout recalculation on resize:
  - Keep the existing `ResizeObserver` + `resize` / `orientationchange` / `visualViewport.resize` listeners, but observe the container and recompute from the passed height prop.
  - On every change call `client.updateVideoOptionsViewSizes({ default, ribbon })` (the SDK's official re-layout API — there is no `client.resize()` in the embedded SDK) and, in addition, re-assert the explicit pixel height on the Zoom root node afterwards, since the SDK writes its own inline height when it re-lays out gallery tiles.
  - Also trigger a recompute on Zoom's own layout-affecting events (`user-added`, `user-removed`, `video-active-change`, `active-speaker`) so switching from 1 → 2+ participants or Speaker ↔ Gallery view immediately re-fits instead of growing the widget.

### 3. Verification
Drive the meeting page headlessly and assert `document.documentElement.scrollHeight <= window.innerHeight` (no page scroll) plus that the toolbar node's bottom edge is inside the container, in these cases:
- 1 participant, Speaker View
- 2 participants, Gallery View (the reported screenshot case)
- After a window resize and an orientation-style viewport change

Note: a second live participant can't be simulated from the sandbox, so the 2-participant Gallery check is verified by forcing the container to the same dimensions and confirming the widget is clipped to the host box and the toolbar remains visible; final confirmation with a real second attendee is on your side.

## Technical detail
- No backend, edge function, or database change.
- No change to the leave/redirect logic or to the Jitsi provider path.
