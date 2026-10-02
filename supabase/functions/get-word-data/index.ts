import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SYSTEM_PROMPT = `You help intermediate (B1) ESL learners. Return ONLY JSON:
{"simple_definition": "...", "example_sentence": "...", "ipa": "...", "syllables": [{"text": "...", "stress": 1}]}
Rules:
- simple_definition: rewrite the definition in plain English for a B1 learner, maximum 15 words.
- example_sentence: if a dictionary example is given, return it unchanged; otherwise write one simple, everyday sentence using the word.
- ipa: if a dictionary IPA is given, return it unchanged; otherwise write General American IPA using ɹ for r and ˈ for primary stress, wrapped in slashes.
- syllables: split the word's spelling into syllables; stress is 1 for the primary-stressed syllable, 0 for others.`;

// Simple edit distance for "Did you mean...?"
function lev(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

async function suggestions(word: string): Promise<string[]> {
  try {
    const r2 = await fetch(`https://api.datamuse.com/sug?s=${encodeURIComponent(word)}&max=8`);
    const list: { word: string }[] = r2.ok ? await r2.json() : [];
    return list
      .map((x) => x.word)
      .filter((w) => /^[a-z' -]+$/i.test(w) && w.toLowerCase() !== word && lev(w.toLowerCase(), word) <= 3)
      .slice(0, 5);
  } catch {
    return [];
  }
}

async function askAI(apiKey: string, payload: Record<string, string>) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch", "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      instructions: SYSTEM_PROMPT,
      input: [{ role: "user", content: [{ type: "input_text", text: JSON.stringify(payload) }] }],
      text: {
        format: {
          type: "json_schema",
          name: "word_data",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["simple_definition", "example_sentence", "ipa", "syllables"],
            properties: {
              simple_definition: { type: "string" },
              example_sentence: { type: "string" },
              ipa: { type: "string" },
              syllables: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["text", "stress"],
                  properties: { text: { type: "string" }, stress: { type: "integer" } },
                },
              },
            },
          },
        },
      },
    }),
  });
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    console.error("AI gateway error", res.status, detail);
    return { status: res.status, data: null };
  }
  let raw = "";
  let buffer = "";
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += dec.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const p = line.slice(5).trim();
      if (!p || p === "[DONE]") continue;
      try {
        const evt = JSON.parse(p);
        if (evt?.type === "response.output_text.delta") raw += evt.delta ?? "";
      } catch { /* keepalive */ }
    }
  }
  try {
    return { status: 200, data: JSON.parse(raw.replace(/^```(?:json)?|```$/g, "").trim()) };
  } catch {
    return { status: 502, data: null };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Please sign in first." }, 401);

    const body = await req.json().catch(() => ({}));
    const word = String(body?.word ?? "").trim().toLowerCase();
    if (!word || word.length > 40 || !/^[a-z][a-z' -]*$/.test(word)) {
      return json({ error: "Please type one English word using letters only." }, 400);
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1. Cache
    let { data: cached } = await admin.from("words").select("*").ilike("word", word).maybeSingle();

    if (!cached) {
      // 2. Dictionary
      const dRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { headers: { "User-Agent": "WordCoach/1.0 (ebookbuddy.org)", Accept: "application/json" } });
      let pos = "", definition = "", example = "", dictIpa = "", audio: string | null = null;
      let source = "dictionaryapi.dev";
      if (dRes.ok) {
        const entries = await dRes.json();
        const entry = entries?.[0] ?? {};
        const meaning = entry.meanings?.[0] ?? {};
        pos = meaning.partOfSpeech ?? "";
        definition = meaning.definitions?.[0]?.definition ?? "";
        for (const m of entry.meanings ?? []) for (const d of m.definitions ?? []) if (!example && d.example) example = d.example;
        const phonetics: { text?: string; audio?: string }[] = entries.flatMap((e: any) => e.phonetics ?? []);
        const us = phonetics.find((p) => p.text && p.audio?.includes("-us")) ?? phonetics.find((p) => p.text);
        dictIpa = us?.text ?? entry.phonetic ?? "";
        audio = phonetics.find((p) => p.audio?.includes("-us"))?.audio || phonetics.find((p) => p.audio)?.audio || null;
      } else {
        console.log("dictionary status", dRes.status);
        await dRes.body?.cancel();
        // Backup dictionary (Datamuse) when the main one is unreachable
        if (dRes.status !== 404) {
          const m = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=dp&max=1`).then((r) => r.ok ? r.json() : []).catch(() => []);
          const hit = m?.[0];
          if (hit?.word?.toLowerCase() === word && hit.defs?.length) {
            const [p0, ...rest] = String(hit.defs[0]).split("\t");
            const map: Record<string, string> = { n: "noun", v: "verb", adj: "adjective", adv: "adverb" };
            pos = map[p0] ?? p0; definition = rest.join(" "); source = "datamuse";
          }
        }
        if (!definition) {
          return json({ error: `We couldn't find "${word}".`, notFound: true, suggestions: await suggestions(word) }, 404);
        }
      }

      // 3. AI
      const apiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!apiKey) return json({ error: "AI is not configured." }, 500);
      const ai = await askAI(apiKey, { word, part_of_speech: pos, definition, dictionary_example: example, dictionary_ipa: dictIpa });
      if (ai.status === 429) return json({ error: "Lots of people are adding words. Please try again in a moment." }, 429);
      if (ai.status === 402) return json({ error: "AI credits are used up. Please tell your teacher." }, 402);
      if (!ai.data) return json({ error: "Something went wrong. Please try again." }, 502);

      const row = {
        word,
        part_of_speech: pos,
        definition,
        simple_definition: String(ai.data.simple_definition ?? ""),
        ipa: dictIpa || String(ai.data.ipa ?? ""),
        syllables: Array.isArray(ai.data.syllables) ? ai.data.syllables : [],
        example_sentence: example || String(ai.data.example_sentence ?? ""),
        audio_url: audio,
        source,
        needs_review: !dictIpa,
      };
      const { data: ins, error } = await admin.from("words").insert(row).select().single();
      if (error) {
        const { data: again } = await admin.from("words").select("*").ilike("word", word).maybeSingle();
        if (!again) throw error;
        cached = again;
      } else cached = ins;
    }

    // 4. Add to the learner's deck
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await admin.from("user_words").select("id").eq("user_id", u.user.id).eq("word_id", cached.id).maybeSingle();
    if (!existing) {
      const { error } = await admin.from("user_words").insert({ user_id: u.user.id, word_id: cached.id, box: 1, next_review: today });
      if (error) throw error;
    }
    return json({ word: cached, alreadyAdded: !!existing });
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
