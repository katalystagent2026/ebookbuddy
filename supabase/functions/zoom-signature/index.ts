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


    const body = await req.json().catch(() => ({}));
    const role = (body as SignatureRequest).role ?? 0;

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

    // Always read the single ACTIVE Zoom Setup row — never trust client-supplied values
    const { data: activeAccount, error: accountError } = await serviceClient
      .from("zoom_accounts")
      .select("id, name, meeting_id, passcode, sdk_key, sdk_secret, is_active, updated_at")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (accountError) {
      console.error("Failed to read active zoom account:", accountError.message);
    }

    if (!activeAccount?.meeting_id) {
      return new Response(
        JSON.stringify({ error: "No active Zoom meeting configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(
      "Active Zoom Setup row:",
      JSON.stringify({
        id: activeAccount.id,
        name: activeAccount.name,
        meeting_id: activeAccount.meeting_id,
        is_active: activeAccount.is_active,
        updated_at: activeAccount.updated_at,
        has_passcode: Boolean(activeAccount.passcode),
        has_sdk_key: Boolean(activeAccount.sdk_key),
        has_sdk_secret: Boolean(activeAccount.sdk_secret),
      }),
    );

    const requestedMeeting = String(activeAccount.meeting_id).replace(/\s/g, "");
    if (!/^\d{9,12}$/.test(requestedMeeting)) {
      return new Response(
        JSON.stringify({ error: "Configured meeting number is invalid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const passcode = activeAccount.passcode ?? "";

    // Zoom SDK credentials come exclusively from the API Credentials table ("Zoom SDK")
    const { data: zoomCredential, error: credentialError } = await serviceClient
      .from("api_credentials")
      .select("id, name, api_credential_entries(type, key_value)")
      .eq("name", "Zoom SDK")
      .maybeSingle();

    if (credentialError) {
      console.error("Failed to read Zoom SDK credential:", credentialError.message);
    }

    if (!zoomCredential) {
      return new Response(
        JSON.stringify({ error: 'No "Zoom SDK" credential found in API Credentials.' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    type Entry = { type: string | null; key_value: string | null };
    const entries = (zoomCredential.api_credential_entries ?? []) as Entry[];
    const findEntry = (label: string) =>
      entries.find((e) => (e.type ?? "").trim().toLowerCase() === label)?.key_value?.trim() ?? "";

    const sdkKey = findEntry("client id");
    const sdkSecret = findEntry("client secret");

    // TEMPORARY DEBUG LOG — remove once Zoom credentials are confirmed working.
    // Never logs the full secret: only presence, length, and a masked preview.
    const maskSecret = (value: string) =>
      value.length <= 8 ? "*".repeat(value.length) : `${value.slice(0, 4)}...${value.slice(-4)}`;
    console.log(
      "Zoom SDK credential check:",
      JSON.stringify({
        source: "database",
        client_secret_retrieved: Boolean(sdkSecret),
        client_secret_length: sdkSecret.length,
        client_secret_masked: maskSecret(sdkSecret),
        client_id_retrieved: Boolean(sdkKey),
      }),
    );

    if (!sdkKey || !sdkSecret) {
      console.error('Incomplete "Zoom SDK" credential: missing Client ID or Client Secret');
      return new Response(
        JSON.stringify({
          error: 'The "Zoom SDK" credential is missing a Client ID or Client Secret value.',
        }),
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
      // Enables Gallery View in the Web SDK (WebRTC mode)
      video_webrtc_mode: 1,
    };

    console.log("Zoom JWT payload:", JSON.stringify(payload));

    const jwtSignature = await create({ alg: "HS256", typ: "JWT" }, payload, key);

    console.log("Zoom signature generated successfully");

    return new Response(
      JSON.stringify({
        signature: jwtSignature,
        appKey: sdkKey,
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
