import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PLACEHOLDER_PATTERN } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MAX_HTML = 60_000;

const INSTRUCTIONS: Record<string, string> = {
  grammar:
    "Fix spelling, grammar and punctuation only. Keep the wording, meaning, tone and structure as close to the original as possible.",
  professional:
    "Rewrite in a warm, clear, professional tone suitable for a children's reading nonprofit writing to parents and volunteers. Fix any spelling and grammar. Keep the meaning, the facts and roughly the same length and structure.",
};

const SYSTEM_PROMPT = `You edit email content for eBookBuddy, a nonprofit that pairs volunteer reading buddies with children.
You receive an email subject and an HTML body and return improved versions.
Rules:
- Return the body as HTML using only these tags: p, h1, h2, h3, strong, em, u, s, a, ul, ol, li, blockquote, br, hr.
- Keep every token like [[IMAGE_1]] exactly as written, in the same place, each on its own.
- Keep every placeholder like {{guardian_name}} or {{form.volunteer.phone}} exactly as written.
- Keep every link's href exactly as it is.
- Write in the same language as the original (English or Spanish).
- In "notes", briefly list the main changes in plain English (one short sentence each, at most 5).`;

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["subject", "html", "notes"],
  properties: {
    subject: { type: "string" },
    html: { type: "string" },
    notes: { type: "array", items: { type: "string" } },
  },
};

const tokensIn = (s: string, re: RegExp) => (s.match(re) ?? []).sort().join("|");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const uc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await uc.auth.getUser();
    if (!u?.user) return json({ error: "Please sign in first." }, 401);
    const { data: isAdmin } = await uc.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (isAdmin !== true) return json({ error: "Admins only." }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const subject = String(body?.subject ?? "").slice(0, 300);
    const html = String(body?.html ?? "");
    if (!INSTRUCTIONS[action]) return json({ error: "Unknown action." }, 400);
    if (!html.trim() || html.length > MAX_HTML) return json({ error: "Write some content first (or shorten it)." }, 400);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI is not configured." }, 500);

    // Swap images for tokens so the AI can't drop or alter them, then restore.
    const images: string[] = [];
    const masked = html.replace(/<img\b[^>]*>/gi, (tag) => {
      images.push(tag);
      return `[[IMAGE_${images.length}]]`;
    });

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        reasoning: { effort: "low" },
        instructions: SYSTEM_PROMPT,
        input: [{
          role: "user",
          content: [{ type: "input_text", text: `Task: ${INSTRUCTIONS[action]}\n\nSubject:\n${subject}\n\nBody HTML:\n${masked}` }],
        }],
        text: { format: { type: "json_schema", name: "email_edit", strict: true, schema } },
      }),
    });

    if (aiRes.status === 429) return json({ error: "Too many requests, please try again shortly." }, 429);
    if (aiRes.status === 402) return json({ error: "AI credits are exhausted." }, 402);
    if (!aiRes.ok || !aiRes.body) {
      console.error("email-ai-assist gateway", aiRes.status);
      return json({ error: "AI request failed." }, 502);
    }

    // Read the SSE stream and accumulate the output text (same as form-ai-update).
    let raw = "";
    const reader = aiRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload);
          if (evt?.type === "response.output_text.delta" && typeof evt.delta === "string") raw += evt.delta;
          else if (evt?.type === "response.completed" && !raw) raw = String(evt?.response?.output_text ?? "");
          else if (evt?.type === "error" || evt?.type === "response.failed") console.error("email-ai-assist stream error");
        } catch {
          // ignore partial or non-JSON keepalive lines
        }
      }
    }

    let parsed: { subject?: unknown; html?: unknown; notes?: unknown };
    try {
      const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      parsed = JSON.parse(cleaned.slice(cleaned.indexOf("{"), cleaned.lastIndexOf("}") + 1));
    } catch {
      return json({ error: "The AI reply couldn't be read. Please try again." }, 502);
    }

    let outHtml = String(parsed.html ?? "");
    // The AI must keep every image token and {{placeholder}}; otherwise reject rather than lose content.
    if (tokensIn(outHtml, /\[\[IMAGE_\d+\]\]/g) !== tokensIn(masked, /\[\[IMAGE_\d+\]\]/g)) {
      return json({ error: "The AI moved or dropped an image. Please try again." }, 502);
    }
    if (tokensIn(outHtml, PLACEHOLDER_PATTERN) !== tokensIn(masked, PLACEHOLDER_PATTERN)) {
      return json({ error: "The AI changed a field placeholder. Please try again." }, 502);
    }
    outHtml = outHtml
      .replace(/<(script|style|iframe|object|embed)\b[\s\S]*?<\/\1>/gi, "")
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      .replace(/\[\[IMAGE_(\d+)\]\]/g, (_m, n) => images[Number(n) - 1] ?? "");

    return json({
      subject: String(parsed.subject ?? subject).slice(0, 300),
      html: outHtml,
      notes: Array.isArray(parsed.notes) ? parsed.notes.map(String).slice(0, 5) : [],
    });
  } catch (e) {
    console.error("email-ai-assist", String(e));
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
