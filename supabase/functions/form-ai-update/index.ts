import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FIELD_TYPES = [
  "text",
  "email",
  "tel",
  "number",
  "date",
  "textarea",
  "select",
  "checkbox",
];

const SYSTEM_PROMPT = `You are a form builder. You output ONLY JSON describing a web form.

Schema:
{
  "title": string,
  "description": string,
  "submitLabel": string,
  "fields": [
    {
      "name": string (snake_case, unique),
      "label": string,
      "type": one of ${FIELD_TYPES.join(" | ")},
      "required": boolean,
      "placeholder": string (optional),
      "options": string[] (required only when type is "select")
    }
  ]
}

Rules:
- Keep existing fields and their names unless the instruction asks to change or remove them.
- Never invent extra keys. Never wrap the JSON in markdown fences or add commentary.
- Use "checkbox" for single yes/no or acknowledgement fields.
- Maximum 30 fields.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not signed in" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Not signed in" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admins only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const instruction = String(body?.prompt ?? "").trim();
    if (!instruction) {
      return new Response(JSON.stringify({ error: "Describe the change you want" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const current = {
      title: body?.title ?? "",
      description: body?.description ?? "",
      submitLabel: body?.submitLabel ?? "",
      fields: Array.isArray(body?.fields) ? body.fields : [],
    };

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formSchema = {
      type: "object",
      additionalProperties: false,
      required: ["title", "description", "submitLabel", "fields"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        submitLabel: { type: "string" },
        fields: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["name", "label", "type", "required", "placeholder", "options"],
            properties: {
              name: { type: "string" },
              label: { type: "string" },
              type: { type: "string", enum: FIELD_TYPES },
              required: { type: "boolean" },
              placeholder: { type: ["string", "null"] },
              options: { type: ["array", "null"], items: { type: "string" } },
            },
          },
        },
      },
    };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        reasoning: { effort: "low" },
        instructions: SYSTEM_PROMPT,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Current form:\n${JSON.stringify(current, null, 2)}\n\nInstruction:\n${instruction}\n\nReturn the complete updated form JSON.`,
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "form_definition",
            strict: true,
            schema: formSchema,
          },
        },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Too many requests, please try again shortly" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits are exhausted" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok || !aiRes.body) {
      const detail = await aiRes.text().catch(() => "");
      console.error("AI gateway error", aiRes.status, detail);
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read the SSE stream and accumulate the output text.
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
          if (evt?.type === "response.output_text.delta" && typeof evt.delta === "string") {
            raw += evt.delta;
          } else if (evt?.type === "response.completed" && !raw) {
            raw = String(evt?.response?.output_text ?? "");
          } else if (evt?.type === "error" || evt?.type === "response.failed") {
            console.error("AI stream error", payload);
          }
        } catch {
          // ignore partial or non-JSON keepalive lines
        }
      }
    }
    if (!raw.trim()) {
      return new Response(JSON.stringify({ error: "AI returned an empty form" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleaned = String(raw).replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start === -1 || end === -1) {
        return new Response(JSON.stringify({ error: "AI returned an unreadable form" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    }

    const slug = (s: string) =>
      s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);

    const seen = new Set<string>();
    const fields = (Array.isArray(parsed.fields) ? parsed.fields : [])
      .slice(0, 30)
      .map((f: Record<string, unknown>, i: number) => {
        const label = String(f?.label ?? `Field ${i + 1}`).slice(0, 120);
        let name = slug(String(f?.name ?? label)) || `field_${i + 1}`;
        while (seen.has(name)) name = `${name}_${i + 1}`;
        seen.add(name);
        const type = FIELD_TYPES.includes(String(f?.type)) ? String(f?.type) : "text";
        const options = Array.isArray(f?.options)
          ? (f.options as unknown[]).map((o) => String(o).slice(0, 120)).slice(0, 40)
          : [];
        return {
          name,
          label,
          type,
          required: Boolean(f?.required),
          placeholder: String(f?.placeholder ?? "").slice(0, 160),
          ...(type === "select" ? { options } : {}),
        };
      });

    return new Response(
      JSON.stringify({
        title: String(parsed.title ?? current.title ?? "").slice(0, 200),
        description: String(parsed.description ?? current.description ?? "").slice(0, 600),
        submitLabel: String(parsed.submitLabel ?? current.submitLabel ?? "Submit").slice(0, 60),
        fields,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("form-ai-update failed", e);
    return new Response(JSON.stringify({ error: "Something went wrong" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
