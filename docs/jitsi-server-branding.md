# Jitsi server branding (meet.ebookbuddy.org)

How to show the eBookBuddy logo and name inside the Jitsi video call instead of
Jitsi's. This is done on the Jitsi **server**, not in the eBookBuddy app.

`meet.ebookbuddy.org` is a **docker-jitsi-meet** install. Everything below
happens on that server, in the folder that holds `docker-compose.yml` and `.env`.

## What you need

- The eBookBuddy logo as **SVG** (best) or **PNG** with a transparent background.
  A wide logo works best (about 3:1, for example 300 × 100 px). It appears in
  the top-left corner of the call.

## 1. Put the logo on the server

```bash
mkdir -p branding
# copy the logo file into ./branding/, for example:
#   branding/ebookbuddy-logo.svg
```

## 2. Serve it in place of the Jitsi logo

Create (or add to) `docker-compose.override.yml` next to `docker-compose.yml`:

```yaml
services:
  web:
    volumes:
      - ./branding/ebookbuddy-logo.svg:/usr/share/jitsi-meet/images/watermark.svg:ro
```

This swaps Jitsi's logo file (`images/watermark.svg`) for ours. For a **PNG**
logo, use this line instead, then uncomment `DEFAULT_LOGO_URL` in step 3:

```yaml
      - ./branding/ebookbuddy-logo.png:/usr/share/jitsi-meet/images/ebookbuddy-logo.png:ro
```

## 3. Set the logo link and names

Find the config folder: it's the `CONFIG` value in `.env`
(usually `~/.jitsi-meet-cfg`). Create the file
`<CONFIG>/web/custom-interface_config.js` with:

```js
interfaceConfig.SHOW_JITSI_WATERMARK = true;
interfaceConfig.JITSI_WATERMARK_LINK = 'https://ebookbuddy.org';
interfaceConfig.APP_NAME = 'eBookBuddy';
interfaceConfig.NATIVE_APP_NAME = 'eBookBuddy';
interfaceConfig.PROVIDER_NAME = 'eBookBuddy';
// Only for a PNG logo (see step 2): uncomment this line.
// interfaceConfig.DEFAULT_LOGO_URL = 'images/ebookbuddy-logo.png';
```

The web container adds this file to `interface_config.js` every time it starts.

## 4. Restart the web container

```bash
docker compose up -d --force-recreate web
```

## 5. Check it

1. Open `https://meet.ebookbuddy.org/images/watermark.svg`. It should show the eBookBuddy logo.
2. Open `https://meet.ebookbuddy.org/interface_config.js`. The last lines should be the ones from step 3.
3. Hard-refresh the browser (Ctrl + Shift + R) before testing a call.

## 6. Turn the logo back on in the app

The eBookBuddy app currently **hides** the Jitsi logo
(`SHOW_JITSI_WATERMARK: false` in `src/components/JitsiMeetingFrame.tsx`).
Once the server shows our logo in that spot, remove that line from the app so
the eBookBuddy logo can appear.
