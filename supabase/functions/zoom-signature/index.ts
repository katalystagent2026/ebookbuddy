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


    const sdkKey = Deno.env.get("ZOOM_SDK_KEY");
    const sdkSecret = Deno.env.get("ZOOM_SDK_SECRET");

    if (!sdkKey || !sdkSecret) {
      console.error("Missing ZOOM_SDK_KEY or ZOOM_SDK_SECRET");
      return new Response(
        JSON.stringify({ error: "Zoom SDK credentials not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { meetingNumber, role = 0 }: SignatureRequest = await req.json();

    if (!meetingNumber) {
      return new Response(
        JSON.stringify({ error: "Meeting number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate signature
    const iat = Math.round(Date.now() / 1000) - 30;
    const exp = iat + 60 * 60 * 2;

    const oHeader = { alg: "HS256", typ: "JWT" };
    const oPayload = {
      sdkKey,
      mn: meetingNumber,
      role,
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
