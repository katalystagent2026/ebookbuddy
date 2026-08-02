import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";
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

    // Prefer an active Zoom setup configured in the admin dashboard
    const { data: accounts } = await serviceClient
      .from("zoom_accounts")
      .select("sdk_key, sdk_secret, meeting_id")
      .eq("is_active", true);

    const matchedAccount = (accounts ?? []).find(
      (a: { meeting_id: string | null }) =>
        String(a.meeting_id ?? "").replace(/\s/g, "") === requestedMeeting,
    );

    let sdkKey = matchedAccount?.sdk_key || "";
    let sdkSecret = matchedAccount?.sdk_secret || "";

    if (!matchedAccount) {
      // Fall back to the legacy single meeting config + platform secrets
      const { data: config } = await serviceClient
        .from("zoom_config")
        .select("meeting_id")
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


    // Generate signature
    const iat = Math.round(Date.now() / 1000) - 30;
    const exp = iat + 60 * 60 * 2;

    const oHeader = { alg: "HS256", typ: "JWT" };
    const oPayload = {
      sdkKey,
      mn: requestedMeeting,
      role: effectiveRole,
      iat,
      exp,
      tokenExp: exp,
    };


    const sHeader = btoa(JSON.stringify(oHeader))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const sPayload = btoa(JSON.stringify(oPayload))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const signatureInput = `${sHeader}.${sPayload}`;
    const hmac = createHmac("sha256", sdkSecret);
    hmac.update(signatureInput);
    const signature = hmac.digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const jwtSignature = `${sHeader}.${sPayload}.${signature}`;

    console.log("Zoom signature generated successfully");

    return new Response(
      JSON.stringify({ signature: jwtSignature, sdkKey }),
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
