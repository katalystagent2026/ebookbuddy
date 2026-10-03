import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const uc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await uc.auth.getUser();
    if (!u?.user) return json({ error: "Please sign in first." }, 401);

    const body = await req.json().catch(() => ({}));
    const wordId = String(body?.word_id ?? "");
    const audioB64 = String(body?.audio ?? "");
    if (!wordId || !audioB64 || audioB64.length > 2_000_000) return json({ error: "Please record again." }, 400);

    const { data: word } = await uc.from("words").select("id, word").eq("id", wordId).maybeSingle();
    if (!word) return json({ error: "Word not found." }, 404);

    const key = Deno.env.get("AZURE_SPEECH_KEY"), region = Deno.env.get("AZURE_REGION");
    if (!key || !region) return json({ error: "Speech is not set up yet." }, 500);

    const cfg = btoa(JSON.stringify({
      ReferenceText: word.word, GradingSystem: "HundredMark", Granularity: "Phoneme",
      Dimension: "Comprehensive", PhonemeAlphabet: "IPA",
    }));
    const bytes = Uint8Array.from(atob(audioB64), (c) => c.charCodeAt(0));
    const res = await fetch(
      `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": key,
          "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
          "Pronunciation-Assessment": cfg,
          Accept: "application/json",
        },
        body: bytes,
      },
    );
    if (!res.ok) {
      const t = await res.text();
      console.error("azure", res.status, t);
      return json({ error: "We couldn't check that. Please try again." }, 502);
    }
    const r = await res.json();
    const best = r?.NBest?.[0];
    if (r?.RecognitionStatus !== "Success" || !best) {
      return json({ error: "We didn't hear you. Hold the phone closer and try again." }, 422);
    }
    const w = best.Words?.[0];
    const score = Math.round(best.PronunciationAssessment?.PronScore ?? best.PronunciationAssessment?.AccuracyScore ?? w?.PronunciationAssessment?.AccuracyScore ?? 0);
    const phonemes = (w?.Phonemes ?? []).map((p: any) => ({ phoneme: p.Phoneme, score: Math.round(p.PronunciationAssessment?.AccuracyScore ?? 0) }));
    const weak = phonemes.filter((p: any) => p.score < 60);

    await uc.from("attempts").insert({ user_id: u.user.id, word_id: word.id, score, weak_phonemes: weak });
    return json({ score, phonemes, weak });
  } catch (e) {
    console.error("assess", e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
