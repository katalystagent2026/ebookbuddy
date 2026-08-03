import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await anonClient.auth.getClaims(token);
    if (authError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);

    const callerId = (claimsData.claims as Record<string, unknown>).sub as string;

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });
    if (isAdmin !== true) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const userId = String(body?.userId ?? "");

    const ALLOWED_ROLES = ["admin", "user", "student", "volunteer"];
    const isUuid = (v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

    if (action === "create") {
      const fullName = typeof body?.fullName === "string" ? body.fullName.trim().slice(0, 120) : "";
      const email = typeof body?.email === "string" ? body.email.trim().slice(0, 255) : "";
      const password = typeof body?.password === "string" ? body.password : "";
      const role = ALLOWED_ROLES.includes(body?.role) ? body.role : "volunteer";
      const zoomAccountId = isUuid(body?.zoomAccountId) ? body.zoomAccountId : null;
      const isVerified = body?.isVerified === true;

      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Invalid email address" }, 400);
      if (password.length < 6) return json({ error: "Password must be at least 6 characters" }, 400);

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (createError || !created?.user) return json({ error: createError?.message ?? "Failed to create user" }, 400);

      const newId = created.user.id;
      await admin.from("profiles").upsert(
        { user_id: newId, email, full_name: fullName, is_verified: isVerified, zoom_account_id: zoomAccountId },
        { onConflict: "user_id" },
      );
      await admin.from("user_roles").delete().eq("user_id", newId);
      await admin.from("user_roles").insert({ user_id: newId, role });

      return json({ success: true, userId: newId });
    }

    if (!/^[0-9a-f-]{36}$/i.test(userId)) return json({ error: "Valid userId required" }, 400);

    if (action === "delete") {
      if (userId === callerId) return json({ error: "You cannot delete your own account" }, 400);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json({ error: error.message }, 400);
      await admin.from("profiles").delete().eq("user_id", userId);
      return json({ success: true });
    }

    if (action === "update") {
      const fullName = typeof body?.fullName === "string" ? body.fullName.trim().slice(0, 120) : undefined;
      const email = typeof body?.email === "string" ? body.email.trim().slice(0, 255) : undefined;

      if (email !== undefined && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return json({ error: "Invalid email address" }, 400);
      }

      if (email !== undefined || fullName !== undefined) {
        const attrs: Record<string, unknown> = {};
        if (email !== undefined) attrs.email = email;
        if (fullName !== undefined) attrs.user_metadata = { full_name: fullName };
        const { error } = await admin.auth.admin.updateUserById(userId, attrs);
        if (error) return json({ error: error.message }, 400);
      }

      const profileUpdate: Record<string, unknown> = {};
      if (fullName !== undefined) profileUpdate.full_name = fullName;
      if (email !== undefined) profileUpdate.email = email;
      if (typeof body?.isVerified === "boolean") profileUpdate.is_verified = body.isVerified;
      if (body?.zoomAccountId !== undefined) {
        profileUpdate.zoom_account_id = isUuid(body.zoomAccountId) ? body.zoomAccountId : null;
      }
      if (Object.keys(profileUpdate).length > 0) {
        const { error } = await admin.from("profiles").update(profileUpdate).eq("user_id", userId);
        if (error) return json({ error: error.message }, 400);
      }

      if (typeof body?.role === "string" && ALLOWED_ROLES.includes(body.role)) {
        await admin.from("user_roles").delete().eq("user_id", userId);
        await admin.from("user_roles").insert({ user_id: userId, role: body.role });
      }

      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (_error) {
    return json({ error: "Request failed" }, 500);
  }
});
