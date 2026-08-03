import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SignatureRequest {
  meetingNumber: string;
  role: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !data?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Caller is authenticated; avoid logging identifying user data.


    const { meetingNumber, role = 0 }: SignatureRequest = await req.json();

    if (!meetingNumber || !/^\d{9,12}$/.test(String(meetingNumber).replace(/\s/g, ""))) {
      return new Response(
        JSON.stringify({ error: "A valid meeting number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestedMeeting = String(meetingNumber).replace(/\s/g, "");

    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Only verified volunteers assigned to the active Zoom room may get a signature
    const callerId = (data.claims as Record<string, unknown>).sub as string | undefined;
    let allowed = false;
    if (callerId) {
      const { data: canJoin } = await serviceClient.rpc("can_join_active_meeting", {
        _user_id: callerId,
      });
      allowed = canJoin === true;
      if (!allowed) {
        const { data: isAdmin } = await serviceClient.rpc("has_role", {
          _user_id: callerId,
          _role: "admin",
        });
        allowed = isAdmin === true;
      }
    }
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Not permitted to join this meeting" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }



    // Prefer an active Zoom setup configured in the admin dashboard
    const { data: accounts } = await serviceClient
      .from("zoom_accounts")
      .select("sdk_key, sdk_secret, meeting_id, passcode")
      .eq("is_active", true);

    const matchedAccount = (accounts ?? []).find(
      (a: { meeting_id: string | null }) =>
        String(a.meeting_id ?? "").replace(/\s/g, "") === requestedMeeting,
    );

    let sdkKey = matchedAccount?.sdk_key || "";
    let sdkSecret = matchedAccount?.sdk_secret || "";
    let passcode = matchedAccount?.passcode || "";

    if (!matchedAccount) {
      // Fall back to the legacy single meeting config + platform secrets
      const { data: config } = await serviceClient
        .from("zoom_config")
        .select("meeting_id, passcode")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const configuredMeeting = String(config?.meeting_id ?? "").replace(/\s/g, "");
      if (!configuredMeeting || configuredMeeting !== requestedMeeting) {
        return new Response(
          JSON.stringify({ error: "Meeting not allowed" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      passcode = config?.passcode ?? "";
      sdkKey = Deno.env.get("ZOOM_SDK_KEY") ?? "";
      sdkSecret = Deno.env.get("ZOOM_SDK_SECRET") ?? "";
    }


    if (!sdkKey || !sdkSecret) {
      console.error("Missing Zoom SDK credentials for the requested meeting");
      return new Response(
        JSON.stringify({ error: "Zoom SDK credentials not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    // Host role (1) is reserved for admins; everyone else joins as attendee (0)
    let effectiveRole = 0;
    if (Number(role) === 1) {
      const userId = (data.claims as Record<string, unknown>).sub as string | undefined;
      if (userId) {
        const { data: isAdmin } = await serviceClient.rpc("has_role", {
          _user_id: userId,
          _role: "admin",
        });
        if (isAdmin === true) effectiveRole = 1;
      }
      if (effectiveRole !== 1) {
        return new Response(
          JSON.stringify({ error: "Host role not permitted" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }


    // Generate signature with djwt (HS256)
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(sdkSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );

    const payload = {
      sdkKey,
      mn: Number(requestedMeeting),
      role: effectiveRole,
      iat: getNumericDate(0) - 30,
      exp: getNumericDate(7200),
      appKey: sdkKey,
      tokenExp: getNumericDate(7200),
    };

    console.log("Zoom JWT payload:", JSON.stringify(payload));

    const jwtSignature = await create({ alg: "HS256", typ: "JWT" }, payload, key);

    console.log("Zoom signature generated successfully");

    return new Response(
      JSON.stringify({
        signature: jwtSignature,
        sdkKey,
        meetingNumber: requestedMeeting,
        passcode,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating Zoom signature:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate meeting signature" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
