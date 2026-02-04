import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SignatureRequest {
  meetingNumber: string;
  role: number; // 0 for attendee, 1 for host
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sdkKey = Deno.env.get("ZOOM_SDK_KEY");
    const sdkSecret = Deno.env.get("ZOOM_SDK_SECRET");

    if (!sdkKey || !sdkSecret) {
      console.error("Missing ZOOM_SDK_KEY or ZOOM_SDK_SECRET");
      return new Response(
        JSON.stringify({
          error: "Zoom SDK credentials not configured. Please add ZOOM_SDK_KEY and ZOOM_SDK_SECRET in your project secrets.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { meetingNumber, role = 0 }: SignatureRequest = await req.json();

    if (!meetingNumber) {
      return new Response(
        JSON.stringify({ error: "Meeting number is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate signature
    const iat = Math.round(Date.now() / 1000) - 30;
    const exp = iat + 60 * 60 * 2; // 2 hours

    const oHeader = { alg: "HS256", typ: "JWT" };
    const oPayload = {
      sdkKey: sdkKey,
      mn: meetingNumber,
      role: role,
      iat: iat,
      exp: exp,
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

    console.log("Generated Zoom signature for meeting:", meetingNumber);

    return new Response(
      JSON.stringify({
        signature: jwtSignature,
        sdkKey: sdkKey,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating Zoom signature:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate meeting signature" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
