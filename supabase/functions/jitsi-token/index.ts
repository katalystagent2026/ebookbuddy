import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SignJWT } from "npm:jose@5.9.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ROOM_PATTERN = /^ebb-[a-z0-9]{16}$/;
const TOKEN_LIFETIME_SECONDS = 3 * 60 * 60;

const randomRoomName = () => {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  // 252 is the largest multiple of 36 below 256, so rejecting >= 252 keeps every character equally likely.
  const chars: string[] = [];
  while (chars.length < 16) {
    for (const b of crypto.getRandomValues(new Uint8Array(32))) {
      if (b < 252 && chars.length < 16) chars.push(alphabet[b % 36]);
    }
  }
  return "ebb-" + chars.join("");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const uc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await uc.auth.getUser();
    if (!u?.user) return json({ error: "Please sign in first." }, 401);

    const body = await req.json().catch(() => ({}));
    const setupId = String(body?.setup_id ?? "");
    if (!setupId) return json({ error: "No meeting was selected." }, 400);

    const secret = Deno.env.get("JITSI_JWT_SECRET"), appId = Deno.env.get("JITSI_APP_ID");
    if (!secret || !appId) return json({ error: "Video calls are not set up yet." }, 500);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Same rule as zoom-signature: admins, or verified volunteers an admin assigned to this setup.
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    let allowed = isAdmin === true;
    if (!allowed) {
      const [{ data: isVolunteer }, { data: profile }] = await Promise.all([
        admin.rpc("has_role", { _user_id: u.user.id, _role: "volunteer" }),
        admin.from("profiles").select("is_verified, zoom_account_id").eq("user_id", u.user.id).maybeSingle(),
      ]);
      allowed = isVolunteer === true && profile?.is_verified === true && profile?.zoom_account_id === setupId;
    }
    if (!allowed) {
      return json({ error: "You're not assigned to this meeting room. Please contact an administrator." }, 403);
    }

    const { data: setup } = await admin
      .from("zoom_accounts")
      .select("id, is_active, video_provider, jitsi_room_name")
      .eq("id", setupId)
      .maybeSingle();
    if (!setup || !setup.is_active || setup.video_provider !== "jitsi") {
      return json({ error: "This meeting isn't available right now." }, 404);
    }

    // Create the room name once. The conditional update means two people joining
    // at the same moment both end up with whichever name was saved first.
    let room = String(setup.jitsi_room_name ?? "");
    if (!ROOM_PATTERN.test(room)) {
      await admin.from("zoom_accounts").update({ jitsi_room_name: randomRoomName() }).eq("id", setup.id).eq("jitsi_room_name", room);
      const { data: saved } = await admin.from("zoom_accounts").select("jitsi_room_name").eq("id", setup.id).maybeSingle();
      room = String(saved?.jitsi_room_name ?? "");
      if (!ROOM_PATTERN.test(room)) return json({ error: "We couldn't open the meeting room. Please try again." }, 500);
    }

    const name = String(u.user.user_metadata?.full_name || u.user.email?.split("@")[0] || "eBookBuddy User");
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({
      room,
      context: {
        // Only admins and volunteers get this far, and both are moderators.
        user: { id: u.user.id, name, moderator: true },
      },
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setAudience("jitsi")
      .setIssuer(appId)
      .setSubject("meet.jitsi")
      .setNotBefore(now - 60)
      .setExpirationTime(now + TOKEN_LIFETIME_SECONDS)
      .sign(new TextEncoder().encode(secret));

    return json({ token, room });
  } catch (e) {
    console.error("jitsi-token", e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
