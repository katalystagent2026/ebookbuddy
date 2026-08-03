import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const FN_URL = `${SUPABASE_URL}/functions/v1/zoom-signature`;

// Optional: a signed-in admin/verified-volunteer access token to exercise the happy path
const TEST_ACCESS_TOKEN = Deno.env.get("TEST_ACCESS_TOKEN") ?? "";

async function callFn(token?: string) {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    // Client-supplied meeting number must be ignored by the function
    body: JSON.stringify({ meetingNumber: "88507220856", role: 0 }),
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text);
  } catch {
    // non-JSON body
  }
  return { status: res.status, json, text };
}

Deno.test("rejects unauthenticated callers", async () => {
  const { status, json } = await callFn();
  assertEquals(status, 401);
  assertEquals(json.error, "Unauthorized");
});

Deno.test("rejects invalid tokens", async () => {
  const { status } = await callFn("not-a-real-jwt");
  assertEquals(status, 401);
});

Deno.test("returns the current Active Zoom Setup meeting number and passcode", async () => {
  if (!TEST_ACCESS_TOKEN) {
    console.warn(
      "Skipping happy-path test: set TEST_ACCESS_TOKEN to an admin/verified-volunteer access token.",
    );
    return;
  }
  if (!SERVICE_ROLE_KEY) {
    console.warn("Skipping happy-path test: SUPABASE_SERVICE_ROLE_KEY not available.");
    return;
  }

  // Read the expected values straight from the Active Zoom Setup row
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: active } = await admin
    .from("zoom_accounts")
    .select("meeting_id, passcode, name")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  assert(active?.meeting_id, "expected an active Zoom Setup row");

  const { status, json } = await callFn(TEST_ACCESS_TOKEN);
  assertEquals(status, 200);
  assertEquals(String(json.meetingNumber), String(active!.meeting_id).replace(/\s/g, ""));
  assertEquals(String(json.passcode ?? ""), String(active!.passcode ?? ""));
  assert(typeof json.signature === "string" && (json.signature as string).split(".").length === 3);
  assert(typeof json.sdkKey === "string" && (json.sdkKey as string).length > 0);
});
