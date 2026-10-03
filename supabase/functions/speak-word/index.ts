import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import * as sdk from "npm:microsoft-cognitiveservices-speech-sdk@1.40.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const VOICE = "en-US-JennyNeural";
const BUCKET = "word-audio";
const esc = (s: string) => s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!));

async function hash(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function toB64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function synth(ssml: string, key: string, region: string): Promise<{ audio: Uint8Array; visemes: { id: number; t: number }[] }> {
  return new Promise((resolve, reject) => {
    const cfg = sdk.SpeechConfig.fromSubscription(key, region);
    cfg.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;
    const synth = new sdk.SpeechSynthesizer(cfg, null as unknown as sdk.AudioConfig);
    const visemes: { id: number; t: number }[] = [];
    synth.visemeReceived = (_s, e) => visemes.push({ id: e.visemeId, t: Math.round(e.audioOffset / 10000) });
    synth.speakSsmlAsync(
      ssml,
      (r) => {
        synth.close();
        if (r.reason === sdk.ResultReason.SynthesizingAudioCompleted) resolve({ audio: new Uint8Array(r.audioData), visemes });
        else reject(new Error(r.errorDetails || "Speech failed"));
      },
      (err) => { synth.close(); reject(new Error(String(err))); },
    );
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const uc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await uc.auth.getUser();
    if (!u?.user) return json({ error: "Please sign in first." }, 401);

    const body = await req.json().catch(() => ({}));
    const text = String(body?.text ?? "").trim();
    const ipa = String(body?.ipa ?? "").replace(/[\/\[\]]/g, "").trim();
    const isWord = body?.kind !== "sentence";
    if (!text || text.length > 300) return json({ error: "Nothing to say." }, 400);

    const key = Deno.env.get("AZURE_SPEECH_KEY"), region = Deno.env.get("AZURE_REGION");
    if (!key || !region) return json({ error: "Speech is not set up yet." }, 500);

    const inner = isWord && ipa ? `<phoneme alphabet="ipa" ph="${esc(ipa)}">${esc(text)}</phoneme>` : esc(text);
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US"><voice name="${VOICE}">${isWord ? `<prosody rate="-15%">${inner}</prosody>` : inner}</voice></speak>`;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const id = await hash(`${VOICE}|${ssml}`);
    const mp3Path = `${id}.mp3`, visPath = `${id}.json`;

    // Cache hit
    const [{ data: a }, { data: v }] = await Promise.all([
      admin.storage.from(BUCKET).download(mp3Path),
      admin.storage.from(BUCKET).download(visPath),
    ]);
    if (a && v) {
      return json({ audio: toB64(new Uint8Array(await a.arrayBuffer())), visemes: JSON.parse(await v.text()), cached: true });
    }

    const { audio, visemes } = await synth(ssml, key, region);
    await Promise.all([
      admin.storage.from(BUCKET).upload(mp3Path, audio, { contentType: "audio/mpeg", upsert: true }),
      admin.storage.from(BUCKET).upload(visPath, JSON.stringify(visemes), { contentType: "application/json", upsert: true }),
    ]);
    return json({ audio: toB64(audio), visemes, cached: false });
  } catch (e) {
    console.error("speak-word", e);
    return json({ error: "Could not play the sound. Please try again." }, 500);
  }
});
